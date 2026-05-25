import { groupBy } from 'lodash';
import { type Prisma, type PrismaPromise } from 'prisma/generated/client';
import {
  type AbiEvent,
  type Address,
  getAbiItem,
  type GetLogsReturnType,
  isAddressEqual,
} from 'viem';
import FilecoinPayV1ABI from '../abis/filecoin-pay-v1-abi';
import { AbstractPoRepIndexerRunner } from './abstract-po-rep-indexer.runner';

type EventType = (typeof events)[number];
type RailCreationInput = Prisma.filecoin_pay_railCreateManyInput;
type PaymentCreationInput = Prisma.filecoin_pay_paymentCreateManyInput;
type RailUpdateInput = Prisma.filecoin_pay_railUpdateManyMutationInput;

type Log = GetLogsReturnType<
  undefined,
  typeof events,
  undefined,
  bigint,
  bigint
>[number];
type Logs = Log[];

const events = [
  getAbiItem({ abi: FilecoinPayV1ABI, name: 'RailCreated' }),
  getAbiItem({ abi: FilecoinPayV1ABI, name: 'RailLockupModified' }),
  getAbiItem({ abi: FilecoinPayV1ABI, name: 'RailOneTimePaymentProcessed' }),
  getAbiItem({ abi: FilecoinPayV1ABI, name: 'RailRateModified' }),
  getAbiItem({ abi: FilecoinPayV1ABI, name: 'RailSettled' }),
  getAbiItem({ abi: FilecoinPayV1ABI, name: 'RailTerminated' }),
  getAbiItem({ abi: FilecoinPayV1ABI, name: 'RailFinalized' }),
] as const satisfies AbiEvent[];

export class FilecoinPayIndexerRunner extends AbstractPoRepIndexerRunner<EventType> {
  public getName(): string {
    return FilecoinPayIndexerRunner.name;
  }

  protected getOriginBlock(): bigint {
    // We only care about rails and payments created after the creation of
    // PoRep contracts
    return 5934198n;
  }

  protected getVersion(): number {
    return 3;
  }

  protected getBatchBlockSize(): bigint {
    return 2n * 60n * 12n; // 12h worth of logs
  }

  protected getEventTypes() {
    return events;
  }

  protected getOriginAddresses(): Address | Address[] | undefined {
    return this.configService.get('FILECOIN_PAY_CONTRACT_ADDRESS');
  }

  protected prepareCleanup(): PrismaPromise<unknown>[] {
    return [
      this.prismaService.filecoin_pay_payment.deleteMany(),
      this.prismaService.filecoin_pay_rail.deleteMany(),
    ];
  }

  protected prepareUpdates(logs: Logs): PrismaPromise<unknown>[] {
    return [
      ...this.prepareRailsCreations(logs),
      ...this.prepareRailUpdates(logs),
      ...this.preparePaymentsCreations(logs),
    ];
  }

  private prepareRailsCreations(logs: Logs): PrismaPromise<unknown>[] {
    const createLogs = logs.filter((log) => {
      return log.eventName === 'RailCreated';
    });

    if (createLogs.length === 0) {
      return [];
    }

    return [
      this.prismaService.filecoin_pay_rail.createMany({
        data: createLogs.map<RailCreationInput>((log) => {
          return {
            railId: log.args.railId,
            token: log.args.token,
            from: log.args.payer,
            to: log.args.payee,
            operator: log.args.operator,
            validator: log.args.validator,
            settledUpTo: log.blockNumber,
            // eslint-disable-next-line no-restricted-syntax
            commissionRateBps: Number(log.args.commissionRateBps),
            serviceFeeRecipient: log.args.serviceFeeRecipient,
            createdAtBlock: log.blockNumber,
          };
        }),
      }),
    ];
  }

  private prepareRailUpdates(logs: Logs): PrismaPromise<unknown>[] {
    const filecoinPayLogs = logs.filter((log) => {
      return isAddressEqual(
        log.address,
        this.configService.get('FILECOIN_PAY_CONTRACT_ADDRESS'),
      );
    });

    const logsGroupedByRail = groupBy(filecoinPayLogs, (log) => {
      return log.args.railId.toString();
    });

    return Object.entries(logsGroupedByRail).map(([railId, logsForRail]) => {
      // We use `updateMany` here because we want to skip updated on rail we
      // dont have registered (they were created before runner's origin block)
      return this.prismaService.filecoin_pay_rail.updateMany({
        data: logsForRail.reduce(this.logToRailUpdateInput, {}),
        where: {
          railId: BigInt(railId),
        },
      });
    });
  }

  private preparePaymentsCreations(logs: Logs): PrismaPromise<unknown>[] {
    if (logs.length === 0) {
      return [];
    }

    const oneTimePaymentsCreations = logs
      .filter((log) => log.eventName === 'RailOneTimePaymentProcessed')
      .map<PaymentCreationInput>((log) => {
        const { railId, netPayeeAmount, networkFee, operatorCommission } =
          log.args;
        const totalAmount = netPayeeAmount + networkFee + operatorCommission;

        return {
          railId: railId,
          totalAmount: totalAmount,
          netPayeeAmount: netPayeeAmount,
          networkFee: networkFee,
          operatorCommission: operatorCommission,
          oneTime: true,
          createdAtBlock: log.blockNumber,
        };
      });

    const settlementsCreations = logs
      .filter((log) => log.eventName === 'RailSettled')
      .map<PaymentCreationInput>((log) => {
        const {
          railId,
          totalSettledAmount,
          totalNetPayeeAmount,
          networkFee,
          operatorCommission,
        } = log.args;

        return {
          railId: railId,
          totalAmount: totalSettledAmount,
          netPayeeAmount: totalNetPayeeAmount,
          networkFee: networkFee,
          operatorCommission: operatorCommission,
          oneTime: false,
          createdAtBlock: log.blockNumber,
        };
      });

    return [
      this.prismaService.filecoin_pay_payment.createMany({
        data: [...oneTimePaymentsCreations, ...settlementsCreations],
      }),
    ];
  }

  private logToRailUpdateInput(
    previousUpdateInput: RailUpdateInput,
    log: Log,
  ): RailUpdateInput {
    switch (log.eventName) {
      case 'RailLockupModified':
        return {
          ...previousUpdateInput,
          lockupPeriod: log.args.newLockupPeriod,
          lockupFixed: log.args.newLockupFixed,
        };
      case 'RailRateModified':
        return {
          ...previousUpdateInput,
          paymentRate: log.args.newRate,
          ...(log.args.oldRate === 0n && log.args.newRate > 0n
            ? {
                activatedAtBlock: log.blockNumber,
                settledUpTo: log.blockNumber,
              }
            : {}),
        };
      case 'RailSettled':
        return {
          ...previousUpdateInput,
          settledUpTo: log.args.settledUpTo,
        };
      case 'RailTerminated':
        return {
          ...previousUpdateInput,
          endEpoch: log.args.endEpoch,
        };
      case 'RailFinalized':
        // On-chain, when rail is finalized, all adresses, rate, lockups etc.
        // are reset to zero. We instead set a flag and keep the data.
        return {
          ...previousUpdateInput,
          lockupFixed: 0,
          finalized: true,
        };
      case 'RailOneTimePaymentProcessed':
        return {
          ...previousUpdateInput,
          lockupFixed: {
            decrement:
              log.args.netPayeeAmount +
              log.args.networkFee +
              log.args.operatorCommission,
          },
        };
      default:
        return previousUpdateInput;
    }
  }
}
