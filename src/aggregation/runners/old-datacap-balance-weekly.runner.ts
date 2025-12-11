import { getOldDatacapBalanceWeekly } from 'prisma/generated/client/sql';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';

export class OldDatacapBalanceWeeklyRunner implements AggregationRunner {
  public async run({
    prismaService,
    prometheusMetricService,
  }: AggregationRunnerRunServices): Promise<void> {
    const {
      startGetDataTimerByRunnerNameMetric,
      startStoreDataTimerByRunnerNameMetric,
    } = prometheusMetricService.aggregateMetrics;

    const getDataEndTimerMetric = startGetDataTimerByRunnerNameMetric(
      OldDatacapBalanceWeeklyRunner.name,
    );

    const result = await prismaService.$queryRawTyped(
      getOldDatacapBalanceWeekly(),
    );

    getDataEndTimerMetric();

    const data = result.map((result) => ({
      week: result.week,
      allocator: result.allocator,
      old_dc_balance: result.old_dc_balance,
      allocations: result.allocations,
    }));

    const storeDataEndTimerMetric = startStoreDataTimerByRunnerNameMetric(
      OldDatacapBalanceWeeklyRunner.name,
    );

    await prismaService.$executeRaw`delete from old_datacap_balance_weekly;`;
    await prismaService.old_datacap_balance_weekly.createMany({ data: data });

    storeDataEndTimerMetric();
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.OldDatacapBalanceWeekly];
  }

  getDependingTables(): AggregationTable[] {
    return [
      AggregationTable.AllocatorsWeeklyAcc,
      AggregationTable.OldDatacapBalanceNv22,
    ];
  }
}
