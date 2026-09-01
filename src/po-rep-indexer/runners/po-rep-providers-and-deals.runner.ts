import { groupBy, last } from 'lodash';
import { PoRepDealState, Prisma, PrismaPromise } from 'prisma/generated/client';
import { mergeBigIntFieldUpdate } from 'src/utils/prisma';
import {
  type AbiEvent,
  type Address,
  getAbiItem,
  type GetLogsReturnType,
  isAddressEqual,
} from 'viem';
import PoRepMarketABI from '../abis/po-rep-market.abi';
import SPRegistryABI from '../abis/sp-registry.abi';
import { AbstractPoRepIndexerRunner } from './abstract-po-rep-indexer.runner';

const EPOCHS_IN_DAY = 2880n;

type EventType = (typeof events)[number];
type ProviderCreationInput = Prisma.po_rep_storage_providerCreateManyInput;
type ProviderCapabilitiesCreationInput =
  Prisma.po_rep_storage_provider_capabilitiesCreateManyInput;
type ProviderUpdateInput = Prisma.po_rep_storage_providerUpdateInput;
type OfferCreationInput = Prisma.po_rep_offerCreateManyInput;
type OfferPaymentCreationInput = Prisma.po_rep_offer_paymentCreateManyInput;
type OfferUpdateInput = Prisma.po_rep_offerUpdateInput;
type DealCreationInput = Prisma.po_rep_dealCreateManyInput;
type DealRequirementsCreationInput =
  Prisma.po_rep_deal_requirementsCreateManyInput;
type DealTermsCreationInput = Prisma.po_rep_deal_termsCreateManyInput;
type DealUpdateInput = Prisma.po_rep_dealUpdateInput;
type DealStateChangeCreationInput =
  Prisma.po_rep_deal_state_changeCreateManyInput;

type SPRegistryLog = GetLogsReturnType<
  undefined,
  typeof spRegistryEvents,
  undefined,
  bigint,
  bigint
>[number];
type PoRepMarketLog = GetLogsReturnType<
  undefined,
  typeof poRepMarketEvents,
  undefined,
  bigint,
  bigint
>[number];
type Log = SPRegistryLog | PoRepMarketLog;
type Logs = Log[];

type ProviderScopedLog = Extract<
  SPRegistryLog,
  { eventName: (typeof providerScopedEventNames)[number] }
>;

const spRegistryEvents = [
  getAbiItem({ abi: SPRegistryABI, name: 'ProviderRegistered' }),
  getAbiItem({ abi: SPRegistryABI, name: 'AvailableSpaceUpdated' }),
  getAbiItem({ abi: SPRegistryABI, name: 'CapacityCommitted' }),
  getAbiItem({ abi: SPRegistryABI, name: 'CapacityReleased' }),
  getAbiItem({ abi: SPRegistryABI, name: 'PendingCapacityReserved' }),
  getAbiItem({ abi: SPRegistryABI, name: 'PendingCapacityReleased' }),
  getAbiItem({ abi: SPRegistryABI, name: 'ProviderBlocked' }),
  getAbiItem({ abi: SPRegistryABI, name: 'ProviderUnblocked' }),
  getAbiItem({ abi: SPRegistryABI, name: 'ProviderPaused' }),
  getAbiItem({ abi: SPRegistryABI, name: 'ProviderUnpaused' }),
  getAbiItem({ abi: SPRegistryABI, name: 'PayeeUpdated' }),
  getAbiItem({ abi: SPRegistryABI, name: 'OfferCreated' }),
  getAbiItem({ abi: SPRegistryABI, name: 'OfferActiveUpdated' }),
  getAbiItem({ abi: SPRegistryABI, name: 'OfferPaymentUpdated' }),
] as const satisfies AbiEvent[];

const poRepMarketEvents = [
  getAbiItem({ abi: PoRepMarketABI, name: 'DealCreated' }),
  getAbiItem({ abi: PoRepMarketABI, name: 'DealAccepted' }),
  getAbiItem({ abi: PoRepMarketABI, name: 'RailIdUpdated' }),
  getAbiItem({ abi: PoRepMarketABI, name: 'PaymentActivated' }),
  getAbiItem({ abi: PoRepMarketABI, name: 'DealFinalized' }),
  getAbiItem({ abi: PoRepMarketABI, name: 'DealTerminated' }),
  getAbiItem({ abi: PoRepMarketABI, name: 'DealRejected' }),
  getAbiItem({ abi: PoRepMarketABI, name: 'ManifestLocationUpdated' }),
] as const satisfies AbiEvent[];

const events = [
  ...spRegistryEvents,
  ...poRepMarketEvents,
] as const satisfies AbiEvent[];

const providerScopedEventNames = [
  'AvailableSpaceUpdated',
  'CapacityCommitted',
  'CapacityReleased',
  'PendingCapacityReserved',
  'PendingCapacityReleased',
  'ProviderBlocked',
  'ProviderUnblocked',
  'ProviderPaused',
  'ProviderUnpaused',
  'PayeeUpdated',
] as const satisfies SPRegistryLog['eventName'][];

export class PoRepProvidersAndDealsIndexerRunner extends AbstractPoRepIndexerRunner<EventType> {
  public getName(): string {
    return PoRepProvidersAndDealsIndexerRunner.name;
  }

  protected getOriginBlock(): bigint {
    return 6256576n;
  }

  protected getVersion(): number {
    return 3;
  }

  protected getBatchBlockSize(): bigint {
    return 2n * 60n * 24n; // 1 day worth of logs
  }

  protected getEventTypes() {
    return events;
  }

  protected getOriginAddresses(): Address | Address[] | undefined {
    return [
      this.configService.get('SP_REGISTRY_CONTRACT_ADDRESS'),
      this.configService.get('PO_REP_MARKET_CONTRACT_ADDRESS'),
    ] satisfies Address[];
  }

  protected prepareCleanup(): PrismaPromise<unknown>[] {
    return [
      this.prismaService.po_rep_deal_requirements.deleteMany(),
      this.prismaService.po_rep_deal_terms.deleteMany(),
      this.prismaService.po_rep_deal_state_change.deleteMany(),
      this.prismaService.po_rep_deal.deleteMany(),
      this.prismaService.po_rep_offer_payment.deleteMany(),
      this.prismaService.po_rep_offer.deleteMany(),
      this.prismaService.po_rep_storage_provider_capabilities.deleteMany(),
      this.prismaService.po_rep_storage_provider.deleteMany(),
    ];
  }

  protected async prepareUpdates(
    logs: Logs,
  ): Promise<PrismaPromise<unknown>[]> {
    const dealsCreations = await this.prepareDealsCreations(logs);
    const offersCreations = await this.prepareOffersCreations(logs);

    return [
      ...this.prepareProvidersCreations(logs),
      ...this.prepareProvidersUpdates(logs),
      ...offersCreations,
      ...this.prepareOffersUpdates(logs),
      ...dealsCreations,
      ...this.prepareDealsUpdates(logs),
      ...this.prepareDealStateChangeCreations(logs),
    ];
  }

  private prepareProvidersCreations(logs: Logs): PrismaPromise<unknown>[] {
    const registerLogs = logs
      .filter((log) => {
        return isAddressEqual(
          log.address,
          this.configService.get('SP_REGISTRY_CONTRACT_ADDRESS'),
        );
      })
      .filter((log) => {
        return log.eventName === 'ProviderRegistered';
      });

    if (registerLogs.length === 0) {
      return [];
    }

    return [
      this.prismaService.po_rep_storage_provider.createMany({
        data: registerLogs.map<ProviderCreationInput>((log) => {
          return {
            providerId: log.args.provider,
            organization: log.args.organization,
            registeredAtBlock: log.blockNumber,
          };
        }),
      }),
      this.prismaService.po_rep_storage_provider_capabilities.createMany({
        data: registerLogs.map<ProviderCapabilitiesCreationInput>((log) => {
          return {
            providerId: log.args.provider,
          };
        }),
      }),
    ];
  }

  private prepareProvidersUpdates(logs: Logs): PrismaPromise<unknown>[] {
    const registryLogs = logs.filter((log): log is ProviderScopedLog => {
      return (
        isAddressEqual(
          log.address,
          this.configService.get('SP_REGISTRY_CONTRACT_ADDRESS'),
        ) &&
        (providerScopedEventNames as readonly string[]).includes(
          log.eventName,
        )
      );
    });

    if (registryLogs.length === 0) {
      return [];
    }

    const logsGroupedByProvider = groupBy(registryLogs, (log) => {
      return log.args.provider.toString();
    });

    return Object.entries(logsGroupedByProvider).map(
      ([providerId, logsForProvider]) => {
        return this.prismaService.po_rep_storage_provider.update({
          data: logsForProvider.reduce(this.logToProviderUpdateInput, {}),
          where: {
            providerId: BigInt(providerId),
          },
        });
      },
    );
  }

  private async prepareOffersCreations(
    logs: Logs,
  ): Promise<PrismaPromise<unknown>[]> {
    const offerCreatedLogs = logs
      .filter((log) => {
        return isAddressEqual(
          log.address,
          this.configService.get('SP_REGISTRY_CONTRACT_ADDRESS'),
        );
      })
      .filter((log) => {
        return log.eventName === 'OfferCreated';
      });

    if (offerCreatedLogs.length === 0) {
      return [];
    }

    const offerViews = await Promise.all(
      offerCreatedLogs.map((log) => {
        return this.recentNodeClient.readContract({
          address: this.configService.get('SP_REGISTRY_CONTRACT_ADDRESS'),
          abi: SPRegistryABI,
          functionName: 'getOfferView',
          args: [log.args.offerId],
          authorizationList: undefined,
        });
      }),
    );

    return [
      this.prismaService.po_rep_offer.createMany({
        data: offerCreatedLogs.map<OfferCreationInput>((log, index) => {
          const offerView = offerViews[index];

          return {
            offerId: log.args.offerId,
            providerId: log.args.provider,
            active: offerView.active,
            minSizeBytes: offerView.terms.minSizeBytes,
            maxSizeBytes: offerView.terms.maxSizeBytes,
            minDurationEpochs: offerView.terms.minDurationEpochs,
            maxDurationEpochs: offerView.terms.maxDurationEpochs,
            retrievabilityBps: offerView.slis.retrievabilityBps,
            bandwidthBytesPerSecond: offerView.slis.bandwidthBytesPerSecond,
            latencyMs: offerView.slis.latencyMs,
            indexingPct: offerView.slis.indexingPct,
            createdAtBlock: log.blockNumber,
          };
        }),
      }),
      this.prismaService.po_rep_offer_payment.createMany({
        data: offerViews.flatMap<OfferPaymentCreationInput>((offerView) => {
          return offerView.payments.map((payment) => {
            return {
              offerId: offerView.offerId,
              token: payment.token,
              active: payment.active,
              pricePer32GiBPerMonth: payment.pricePer32GiBPerMonth.toString(),
            };
          });
        }),
      }),
    ];
  }

  private prepareOffersUpdates(logs: Logs): PrismaPromise<unknown>[] {
    const offerActiveLogs = logs
      .filter((log) => {
        return isAddressEqual(
          log.address,
          this.configService.get('SP_REGISTRY_CONTRACT_ADDRESS'),
        );
      })
      .filter((log) => {
        return log.eventName === 'OfferActiveUpdated';
      });

    const offerActiveUpdates = Object.entries(
      groupBy(offerActiveLogs, (log) => log.args.offerId.toString()),
    ).map(([offerId, logsForOffer]) => {
      return this.prismaService.po_rep_offer.update({
        data: {
          active: last(logsForOffer).args.active,
        } satisfies OfferUpdateInput,
        where: {
          offerId: BigInt(offerId),
        },
      });
    });

    const offerPaymentLogs = logs
      .filter((log) => {
        return isAddressEqual(
          log.address,
          this.configService.get('SP_REGISTRY_CONTRACT_ADDRESS'),
        );
      })
      .filter((log) => {
        return log.eventName === 'OfferPaymentUpdated';
      });

    const offerPaymentUpdates = offerPaymentLogs.map((log) => {
      return this.prismaService.po_rep_offer_payment.upsert({
        where: {
          offerId_token: {
            offerId: log.args.offerId,
            token: log.args.token,
          },
        },
        create: {
          offerId: log.args.offerId,
          token: log.args.token,
          active: log.args.active,
          pricePer32GiBPerMonth: log.args.pricePer32GiBPerMonth.toString(),
        },
        update: {
          active: log.args.active,
          pricePer32GiBPerMonth: log.args.pricePer32GiBPerMonth.toString(),
        },
      });
    });

    return [...offerActiveUpdates, ...offerPaymentUpdates];
  }

  private async prepareDealsCreations(
    logs: Logs,
  ): Promise<PrismaPromise<unknown>[]> {
    const dealCreatedLogs = logs
      .filter((log) => {
        return isAddressEqual(
          log.address,
          this.configService.get('PO_REP_MARKET_CONTRACT_ADDRESS'),
        );
      })
      .filter((log) => {
        return log.eventName === 'DealCreated';
      });

    if (dealCreatedLogs.length === 0) {
      return [];
    }

    const dealsPaymentAndTerms = await Promise.all(
      dealCreatedLogs.map(async (log) => {
        const [terms, payment] = await Promise.all([
          this.recentNodeClient.readContract({
            address: this.configService.get('PO_REP_MARKET_CONTRACT_ADDRESS'),
            abi: PoRepMarketABI,
            functionName: 'getDealTerms',
            args: [log.args.dealId],
            authorizationList: undefined,
          }),
          this.recentNodeClient.readContract({
            address: this.configService.get('PO_REP_MARKET_CONTRACT_ADDRESS'),
            abi: PoRepMarketABI,
            functionName: 'getDealPayment',
            args: [log.args.dealId],
            authorizationList: undefined,
          }),
        ]);

        return [log.args.dealId, terms, payment] as const;
      }),
    );

    return [
      this.prismaService.po_rep_deal.createMany({
        data: dealCreatedLogs.map<DealCreationInput>((log) => {
          return {
            dealId: log.args.dealId,
            providerId: log.args.provider,
            client: log.args.client,
            state: PoRepDealState.PROPOSED,
            manifestLocation: log.args.manifestLocation,
            totalDealSize: log.args.totalDealSize,
            proposedAtBlock: log.args.proposedAtBlock,
          };
        }),
      }),
      this.prismaService.po_rep_deal_requirements.createMany({
        data: dealCreatedLogs.map<DealRequirementsCreationInput>((log) => {
          return {
            dealId: log.args.dealId,
            ...log.args.requirements,
          };
        }),
      }),
      this.prismaService.po_rep_deal_terms.createMany({
        data: dealsPaymentAndTerms.map<DealTermsCreationInput>(
          ([dealId, terms, payment]) => {
            return {
              deal_id: dealId,
              deal_size_bytes: terms.requestedSizeBytes,
              price_per_sector_per_month:
                payment.pricePer32GiBPerMonth.toString(),
              duration_days: terms.durationEpochs / EPOCHS_IN_DAY,
            };
          },
        ),
      }),
    ];
  }

  private prepareDealsUpdates(logs: Logs): PrismaPromise<unknown>[] {
    const poRepMarketLogs = logs.filter((log): log is PoRepMarketLog => {
      return (
        isAddressEqual(
          log.address,
          this.configService.get('PO_REP_MARKET_CONTRACT_ADDRESS'),
        ) &&
        poRepMarketEvents
          .map<string>((item) => item.name)
          .includes(log.eventName)
      );
    });

    if (poRepMarketLogs.length === 0) {
      return [];
    }

    const logsGroupedByDeal = groupBy(poRepMarketLogs, (log) => {
      return log.args.dealId.toString();
    });

    return Object.entries(logsGroupedByDeal).map(([dealId, logsForDeal]) => {
      return this.prismaService.po_rep_deal.update({
        data: logsForDeal.reduce(this.logToDealUpdateInput, {}),
        where: {
          dealId: BigInt(dealId),
        },
      });
    });
  }

  private prepareDealStateChangeCreations(
    logs: Logs,
  ): PrismaPromise<unknown>[] {
    const stateChangeLogs = logs
      .filter((log) => {
        return isAddressEqual(
          log.address,
          this.configService.get('PO_REP_MARKET_CONTRACT_ADDRESS'),
        );
      })
      .filter((log) => {
        return (
          log.eventName === 'DealRejected' ||
          log.eventName === 'DealAccepted' ||
          log.eventName === 'PaymentActivated' ||
          log.eventName === 'DealFinalized' ||
          log.eventName === 'DealTerminated'
        );
      });

    if (stateChangeLogs.length === 0) {
      return [];
    }

    return [
      this.prismaService.po_rep_deal_state_change.createMany({
        data: stateChangeLogs.reduce<DealStateChangeCreationInput[]>(
          (result, log) => {
            const state = this.eventNameToDealState(log.eventName);

            if (state === null) {
              return result;
            }

            return [
              ...result,
              {
                deal_id: log.args.dealId,
                state: state,
                changed_at_block: log.blockNumber,
              },
            ];
          },
          [],
        ),
      }),
    ];
  }

  private logToProviderUpdateInput(
    previousUpdateInput: ProviderUpdateInput,
    log: Log,
  ): ProviderUpdateInput {
    switch (log.eventName) {
      case 'AvailableSpaceUpdated':
        return {
          ...previousUpdateInput,
          availableBytes: log.args.availableBytes,
        };
      case 'CapacityCommitted':
        return {
          ...previousUpdateInput,
          committedBytes: mergeBigIntFieldUpdate(
            previousUpdateInput.committedBytes,
            {
              increment: log.args.committedBytes,
            },
          ),
        };
      case 'CapacityReleased':
        return {
          ...previousUpdateInput,
          committedBytes: mergeBigIntFieldUpdate(
            previousUpdateInput.committedBytes,
            {
              decrement: log.args.releasedBytes,
            },
          ),
        };
      case 'PendingCapacityReserved':
        return {
          ...previousUpdateInput,
          pendingBytes: mergeBigIntFieldUpdate(
            previousUpdateInput.pendingBytes,
            {
              increment: log.args.sizeBytes,
            },
          ),
        };
      case 'PendingCapacityReleased':
        return {
          ...previousUpdateInput,
          pendingBytes: mergeBigIntFieldUpdate(
            previousUpdateInput.pendingBytes,
            {
              decrement: log.args.sizeBytes,
            },
          ),
        };
      case 'ProviderBlocked':
        return {
          ...previousUpdateInput,
          blocked: true,
        };
      case 'ProviderUnblocked':
        return {
          ...previousUpdateInput,
          blocked: false,
        };
      case 'ProviderPaused':
        return {
          ...previousUpdateInput,
          paused: true,
        };
      case 'ProviderUnpaused':
        return {
          ...previousUpdateInput,
          paused: false,
        };
      case 'PayeeUpdated':
        return {
          ...previousUpdateInput,
          payee: log.args.newPayee,
        };
      default:
        return previousUpdateInput;
    }
  }

  private logToDealUpdateInput(
    previousUpdateInput: DealUpdateInput,
    log: Log,
  ): DealUpdateInput {
    switch (log.eventName) {
      case 'DealAccepted':
        return {
          ...previousUpdateInput,
          state: PoRepDealState.ACCEPTED,
        };
      case 'RailIdUpdated':
        return {
          ...previousUpdateInput,
          railId: log.args.railId,
        };
      case 'PaymentActivated':
        return {
          ...previousUpdateInput,
          state: PoRepDealState.ACTIVE,
        };
      case 'DealFinalized':
        return {
          ...previousUpdateInput,
          state: PoRepDealState.FINALIZED,
        };
      case 'DealRejected':
        return {
          ...previousUpdateInput,
          state: PoRepDealState.REJECTED,
        };
      case 'DealTerminated':
        return {
          ...previousUpdateInput,
          state: PoRepDealState.EARLY_TERMINATED,
        };
      case 'ManifestLocationUpdated':
        return {
          ...previousUpdateInput,
          manifestLocation: log.args.newManifestLocation,
        };
      default:
        return previousUpdateInput;
    }
  }

  private eventNameToDealState(
    eventName: Log['eventName'],
  ): PoRepDealState | null {
    switch (eventName) {
      case 'DealRejected':
        return PoRepDealState.REJECTED;
      case 'DealAccepted':
        return PoRepDealState.ACCEPTED;
      case 'PaymentActivated':
        return PoRepDealState.ACTIVE;
      case 'DealFinalized':
        return PoRepDealState.FINALIZED;
      case 'DealTerminated':
        return PoRepDealState.EARLY_TERMINATED;
      default:
        return null;
    }
  }
}
