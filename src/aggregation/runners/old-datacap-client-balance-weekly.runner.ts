import { getOldDatacapClientBalanceWeekly } from 'prisma/generated/client/sql';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';

export class OldDatacapClientBalanceWeeklyRunner implements AggregationRunner {
  public async run({
    prismaService,
    prometheusMetricService,
  }: AggregationRunnerRunServices): Promise<void> {
    const {
      startGetDataTimerByRunnerNameMetric,
      startStoreDataTimerByRunnerNameMetric,
    } = prometheusMetricService.aggregateMetrics;

    const getDataEndTimerMetric = startGetDataTimerByRunnerNameMetric(
      OldDatacapClientBalanceWeeklyRunner.name,
    );

    const result = await prismaService.$queryRawTyped(
      getOldDatacapClientBalanceWeekly(),
    );

    getDataEndTimerMetric();

    const data = result.map((result) => ({
      week: result.week,
      client: result.client,
      old_dc_balance: result.old_dc_balance,
      claims: result.claims,
    }));

    const storeDataEndTimerMetric = startStoreDataTimerByRunnerNameMetric(
      OldDatacapClientBalanceWeeklyRunner.name,
    );

    await prismaService.$executeRaw`delete from old_datacap_client_balance_weekly;`;
    await prismaService.old_datacap_client_balance_weekly.createMany({ data });

    storeDataEndTimerMetric();
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.OldDatacapClientBalanceWeekly];
  }

  getDependingTables(): AggregationTable[] {
    return [
      AggregationTable.ClientAllocatorDistributionWeekly,
      AggregationTable.OldDatacapBalanceNv22,
      AggregationTable.OldDatacapClientBalanceNv22,
    ];
  }
}
