import { PoRepDealState, Prisma, PrismaPromise } from 'prisma/generated/client';
import { AbiEvent, getAbiItem, GetLogsReturnType, isAddressEqual } from 'viem';
import PoRepMarketABI from '../abis/po-rep-market.abi';
import { AbstractPoRepIndexerRunner } from './abstract-po-rep-indexer.runner';

type EventType = (typeof events)[number];
type DealCreationInput = Prisma.po_rep_dealCreateManyInput;
type DealRequirementsCreationInput =
  Prisma.po_rep_deal_requirementsCreateManyInput;
type DealUpdateInput = Prisma.po_rep_dealUpdateInput;

const events = [
  getAbiItem({ abi: PoRepMarketABI, name: 'DealProposalCreated' }),
  getAbiItem({ abi: PoRepMarketABI, name: 'DealAccepted' }),
  getAbiItem({ abi: PoRepMarketABI, name: 'RailIdUpdated' }),
  getAbiItem({ abi: PoRepMarketABI, name: 'DealCompleted' }),
  getAbiItem({ abi: PoRepMarketABI, name: 'DealTerminated' }),
  getAbiItem({ abi: PoRepMarketABI, name: 'DealRejected' }),
  getAbiItem({ abi: PoRepMarketABI, name: 'ManifestLocationUpdated' }),
] as const satisfies AbiEvent[];

export class PoRepDealsIndexerRunner extends AbstractPoRepIndexerRunner<EventType> {
  public getName(): string {
    return PoRepDealsIndexerRunner.name;
  }

  protected getOriginBlock(): bigint {
    return 5934202n;
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
      this.prismaService.po_rep_deal_requirements.deleteMany({}),
      this.prismaService.po_rep_deal.deleteMany(),
    ];
  }

  protected prepareUpdates(
    logs: GetLogsReturnType<undefined, EventType[], undefined, bigint, bigint>,
  ): PrismaPromise<unknown>[] {
    const poRepMarketLogs = logs.filter((log) => {
      return isAddressEqual(
        log.address,
        this.configService.get('PO_REP_MARKET_CONTRACT_ADDRESS'),
      );
    });

    const proposeLogs = poRepMarketLogs.filter(
      (log) => log.eventName === 'DealProposalCreated',
    );

    const dealsCreations =
      proposeLogs.length > 0
        ? [
            this.prismaService.po_rep_deal.createMany({
              data: proposeLogs.map<DealCreationInput>((log) => {
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
              data: proposeLogs.map<DealRequirementsCreationInput>((log) => {
                return {
                  dealId: log.args.dealId,
                  ...log.args.requirements,
                };
              }),
            }),
          ]
        : [];

    const dealsUpdatesData = poRepMarketLogs.reduce<
      Record<string, DealUpdateInput>
    >((result, log) => {
      const dealId = log.args.dealId.toString();
      const dealUpdateData: DealUpdateInput = result[dealId] ?? {};

      switch (log.eventName) {
        case 'DealAccepted':
          return {
            ...result,
            [dealId]: {
              ...dealUpdateData,
              state: PoRepDealState.ACCEPTED,
            },
          };
        case 'RailIdUpdated':
          return {
            ...result,
            [dealId]: {
              ...dealUpdateData,
              railId: log.args.railId,
            },
          };
        case 'DealCompleted':
          return {
            ...result,
            [dealId]: {
              ...dealUpdateData,
              state: PoRepDealState.COMPLETED,
            },
          };
        case 'DealRejected':
          return {
            ...result,
            [dealId]: {
              ...dealUpdateData,
              state: PoRepDealState.REJECTED,
            },
          };
        case 'DealTerminated':
          return {
            ...result,
            [dealId]: {
              ...dealUpdateData,
              state: PoRepDealState.TERMINATED,
            },
          };
        default:
          return result;
      }
    }, {});

    const dealsUpdates = Object.entries(dealsUpdatesData).map(
      ([dealId, updatedData]) => {
        return this.prismaService.po_rep_deal.update({
          data: updatedData,
          where: {
            dealId: BigInt(dealId),
          },
        });
      },
    );

    return [...dealsCreations, ...dealsUpdates];
  }
}
