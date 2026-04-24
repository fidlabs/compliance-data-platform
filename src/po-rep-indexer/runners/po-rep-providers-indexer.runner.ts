import { Prisma, PrismaPromise } from 'prisma/generated/client';
import { mergeBigIntFieldUpdate } from 'src/utils/prisma';
import { AbiEvent, getAbiItem, GetLogsReturnType, isAddressEqual } from 'viem';
import SPRegistryABI from '../abis/sp-registry.abi';
import { AbstractPoRepIndexerRunner } from './abstract-po-rep-indexer.runner';

type EventType = (typeof events)[number];
type ProviderCreationInput = Prisma.po_rep_storage_providerCreateManyInput;
type ProviderCapabilitiesCreationInput =
  Prisma.po_rep_storage_provider_capabilitiesCreateManyInput;
type ProviderUpdateInput = Prisma.po_rep_storage_providerUpdateInput;
type ProviderCapabilitiesUpdateInput =
  Prisma.po_rep_storage_provider_capabilitiesUpdateInput;

const events = [
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

export class PoRepProvidersIndexerRunner extends AbstractPoRepIndexerRunner<EventType> {
  public getName(): string {
    return PoRepProvidersIndexerRunner.name;
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
      this.prismaService.po_rep_storage_provider_capabilities.deleteMany({}),
      this.prismaService.po_rep_storage_provider.deleteMany(),
    ];
  }

  protected prepareUpdates(
    logs: GetLogsReturnType<undefined, EventType[], undefined, bigint, bigint>,
  ): PrismaPromise<unknown>[] {
    const spRegistryLogs = logs.filter((log) => {
      return isAddressEqual(
        log.address,
        this.configService.get('SP_REGISTRY_CONTRACT_ADDRESS'),
      );
    });

    const registerLogs = spRegistryLogs.filter(
      (log) => log.eventName === 'ProviderRegistered',
    );

    const providersCreations =
      registerLogs.length > 0
        ? [
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
              data: registerLogs.map<ProviderCapabilitiesCreationInput>(
                (log) => {
                  return {
                    providerId: log.args.provider,
                  };
                },
              ),
            }),
          ]
        : [];

    const providersUpdatesData = spRegistryLogs.reduce<
      Record<string, ProviderUpdateInput>
    >((result, log) => {
      const providerId = log.args.provider.toString();
      const providerUpdateData: ProviderUpdateInput = result[providerId] ?? {};

      switch (log.eventName) {
        case 'AvailableSpaceUpdated':
          return {
            ...result,
            [providerId]: {
              ...providerUpdateData,
              availableBytes: log.args.availableBytes,
            },
          };
        case 'CapacityCommitted':
          return {
            ...result,
            [providerId]: {
              ...providerUpdateData,
              committedBytes: mergeBigIntFieldUpdate(
                providerUpdateData.committedBytes,
                {
                  increment: log.args.committedBytes,
                },
              ),
            },
          };
        case 'CapacityReleased':
          return {
            ...result,
            [providerId]: {
              ...providerUpdateData,
              committedBytes: mergeBigIntFieldUpdate(
                providerUpdateData.committedBytes,
                {
                  decrement: log.args.releasedBytes,
                },
              ),
            },
          };
        case 'PriceUpdated':
          return {
            ...result,
            [providerId]: {
              ...providerUpdateData,
              pricePerSectorPerMonth: log.args.newPrice,
            },
          };
        case 'PendingCapacityReserved':
          return {
            ...result,
            [providerId]: {
              ...providerUpdateData,
              pendingBytes: mergeBigIntFieldUpdate(
                providerUpdateData.pendingBytes,
                {
                  increment: log.args.sizeBytes,
                },
              ),
            },
          };
        case 'PendingCapacityReleased':
          return {
            ...result,
            [providerId]: {
              ...providerUpdateData,
              pendingBytes: mergeBigIntFieldUpdate(
                providerUpdateData.pendingBytes,
                {
                  decrement: log.args.sizeBytes,
                },
              ),
            },
          };
        case 'ProviderBlocked':
          return {
            ...result,
            [providerId]: {
              ...providerUpdateData,
              blocked: true,
            },
          };
        case 'ProviderUnblocked':
          return {
            ...result,
            [providerId]: {
              ...providerUpdateData,
              blocked: false,
            },
          };
        case 'ProviderPaused':
          return {
            ...result,
            [providerId]: {
              ...providerUpdateData,
              paused: true,
            },
          };
        case 'ProviderUnpaused':
          return {
            ...result,
            [providerId]: {
              ...providerUpdateData,
              paused: false,
            },
          };
        case 'PayeeUpdated':
          return {
            ...result,
            [providerId]: {
              ...providerUpdateData,
              payee: log.args.newPayee,
            },
          };
        case 'DealDurationLimitsUpdated':
          return {
            ...result,
            [providerId]: {
              ...providerUpdateData,
              minDealDurationDays: log.args.minDealDurationDays,
              maxDealDurationDays: log.args.maxDealDurationDays,
            },
          };
        default:
          return result;
      }
    }, {});

    const providersUpdates = Object.entries(providersUpdatesData).map(
      ([providerId, updatedData]) => {
        return this.prismaService.po_rep_storage_provider.update({
          data: updatedData,
          where: {
            providerId: BigInt(providerId),
          },
        });
      },
    );

    const providerCapabilitiesUpdatesData = spRegistryLogs
      .filter((log) => {
        return log.eventName === 'CapabilitiesUpdated';
      })
      .reduce<Record<string, ProviderCapabilitiesUpdateInput>>(
        (result, log) => {
          return {
            ...result,
            [log.args.provider.toString()]: log.args.capabilities,
          };
        },
        {},
      );

    const providerCapabilitiesUpdates = Object.entries(
      providerCapabilitiesUpdatesData,
    ).map(([providerId, updatedData]) => {
      return this.prismaService.po_rep_storage_provider_capabilities.update({
        data: updatedData,
        where: {
          providerId: BigInt(providerId),
        },
      });
    });

    return [
      ...providersCreations,
      ...providersUpdates,
      ...providerCapabilitiesUpdates,
    ];
  }
}
