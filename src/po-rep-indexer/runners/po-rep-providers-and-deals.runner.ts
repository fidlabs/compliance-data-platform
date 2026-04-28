import { groupBy, last } from 'lodash';
import { PoRepDealState, Prisma, PrismaPromise } from 'prisma/generated/client';
import { mergeBigIntFieldUpdate } from 'src/utils/prisma';
import { AbiEvent, getAbiItem, GetLogsReturnType, isAddressEqual } from 'viem';
import PoRepMarketABI from '../abis/po-rep-market.abi';
import SPRegistryABI from '../abis/sp-registry.abi';
import { AbstractPoRepIndexerRunner } from './abstract-po-rep-indexer.runner';

type EventType = (typeof events)[number];
type ProviderCreationInput = Prisma.po_rep_storage_providerCreateManyInput;
type ProviderCapabilitiesCreationInput =
  Prisma.po_rep_storage_provider_capabilitiesCreateManyInput;
type ProviderUpdateInput = Prisma.po_rep_storage_providerUpdateInput;
type DealCreationInput = Prisma.po_rep_dealCreateManyInput;
type DealRequirementsCreationInput =
  Prisma.po_rep_deal_requirementsCreateManyInput;
type DealUpdateInput = Prisma.po_rep_dealUpdateInput;

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

const spRegistryEvents = [
  getAbiItem({ abi: SPRegistryABI, name: 'ProviderRegistered' }),
  getAbiItem({ abi: SPRegistryABI, name: 'CapabilitiesUpdated' }),
  getAbiItem({ abi: SPRegistryABI, name: 'AvailableSpaceUpdated' }),
  getAbiItem({ abi: SPRegistryABI, name: 'CapacityCommitted' }),
  getAbiItem({ abi: SPRegistryABI, name: 'CapacityReleased' }),
  getAbiItem({ abi: SPRegistryABI, name: 'PriceUpdated' }),
  getAbiItem({ abi: SPRegistryABI, name: 'PendingCapacityReserved' }),
  getAbiItem({ abi: SPRegistryABI, name: 'PendingCapacityReleased' }),
  getAbiItem({ abi: SPRegistryABI, name: 'ProviderBlocked' }),
  getAbiItem({ abi: SPRegistryABI, name: 'ProviderUnblocked' }),
  getAbiItem({ abi: SPRegistryABI, name: 'ProviderPaused' }),
  getAbiItem({ abi: SPRegistryABI, name: 'ProviderUnpaused' }),
  getAbiItem({ abi: SPRegistryABI, name: 'PayeeUpdated' }),
  getAbiItem({ abi: SPRegistryABI, name: 'DealDurationLimitsUpdated' }),
] as const satisfies AbiEvent[];

const poRepMarketEvents = [
  getAbiItem({ abi: PoRepMarketABI, name: 'DealProposalCreated' }),
  getAbiItem({ abi: PoRepMarketABI, name: 'DealAccepted' }),
  getAbiItem({ abi: PoRepMarketABI, name: 'RailIdUpdated' }),
  getAbiItem({ abi: PoRepMarketABI, name: 'DealCompleted' }),
  getAbiItem({ abi: PoRepMarketABI, name: 'DealTerminated' }),
  getAbiItem({ abi: PoRepMarketABI, name: 'DealRejected' }),
  getAbiItem({ abi: PoRepMarketABI, name: 'ManifestLocationUpdated' }),
] as const satisfies AbiEvent[];

const events = [
  ...spRegistryEvents,
  ...poRepMarketEvents,
] as const satisfies AbiEvent[];

export class PoRepProvidersAndDealsIndexerRunner extends AbstractPoRepIndexerRunner<EventType> {
  public getName(): string {
    return PoRepProvidersAndDealsIndexerRunner.name;
  }

  protected getOriginBlock(): bigint {
    return 5934198n;
  }

  protected getVersion(): number {
    return 1;
  }

  protected getBatchBlockSize(): bigint {
    return 2n * 60n * 24n; // 1 day worth of logs
  }

  protected getEventTypes() {
    return events;
  }

  protected prepareCleanup(): PrismaPromise<unknown>[] {
    return [
      this.prismaService.po_rep_deal_requirements.deleteMany(),
      this.prismaService.po_rep_deal.deleteMany(),
      this.prismaService.po_rep_storage_provider_capabilities.deleteMany(),
      this.prismaService.po_rep_storage_provider.deleteMany(),
    ];
  }

  protected prepareUpdates(logs: Logs): PrismaPromise<unknown>[] {
    return [
      ...this.prepareProvidersCreations(logs),
      ...this.prepareProvidersUpdates(logs),
      ...this.prepareProvidersCapabilitiesUpdates(logs),
      ...this.prepareDealsCreations(logs),
      ...this.prepareDealsUpdates(logs),
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
    const registryLogs = logs.filter((log): log is SPRegistryLog => {
      return (
        isAddressEqual(
          log.address,
          this.configService.get('SP_REGISTRY_CONTRACT_ADDRESS'),
        ) &&
        spRegistryEvents
          .map<string>((item) => item.name)
          .includes(log.eventName)
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

  private prepareProvidersCapabilitiesUpdates(
    logs: Logs,
  ): PrismaPromise<unknown>[] {
    const capabilitiesUpdatesLogs = logs
      .filter((log) => {
        return isAddressEqual(
          log.address,
          this.configService.get('SP_REGISTRY_CONTRACT_ADDRESS'),
        );
      })
      .filter((log) => {
        return log.eventName === 'CapabilitiesUpdated';
      });

    if (capabilitiesUpdatesLogs.length === 0) {
      return [];
    }

    const logsGroupedByProvider = groupBy(capabilitiesUpdatesLogs, (log) => {
      return log.args.provider.toString();
    });

    return Object.entries(logsGroupedByProvider).map(
      ([providerId, logsForProvider]) => {
        return this.prismaService.po_rep_storage_provider_capabilities.update({
          data: last(logsForProvider).args.capabilities,
          where: {
            providerId: BigInt(providerId),
          },
        });
      },
    );
  }

  private prepareDealsCreations(logs: Logs): PrismaPromise<unknown>[] {
    const dealProposalLogs = logs
      .filter((log) => {
        return isAddressEqual(
          log.address,
          this.configService.get('PO_REP_MARKET_CONTRACT_ADDRESS'),
        );
      })
      .filter((log) => {
        return log.eventName === 'DealProposalCreated';
      });

    if (dealProposalLogs.length === 0) {
      return [];
    }

    return [
      this.prismaService.po_rep_deal.createMany({
        data: dealProposalLogs.map<DealCreationInput>((log) => {
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
        data: dealProposalLogs.map<DealRequirementsCreationInput>((log) => {
          return {
            dealId: log.args.dealId,
            ...log.args.requirements,
          };
        }),
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
      case 'PriceUpdated':
        return {
          ...previousUpdateInput,
          pricePerSectorPerMonth: log.args.newPrice,
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
      case 'DealDurationLimitsUpdated':
        return {
          ...previousUpdateInput,
          minDealDurationDays: log.args.minDealDurationDays,
          maxDealDurationDays: log.args.maxDealDurationDays,
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
      case 'DealCompleted':
        return {
          ...previousUpdateInput,
          state: PoRepDealState.COMPLETED,
        };
      case 'DealRejected':
        return {
          ...previousUpdateInput,
          state: PoRepDealState.REJECTED,
        };
      case 'DealTerminated':
        return {
          ...previousUpdateInput,
          state: PoRepDealState.TERMINATED,
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
}
