import { getOldDatacapBalanceNv22 } from 'prismaDmob/generated/client/sql';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';

export class OldDatacapBalanceNv22Runner implements AggregationRunner {
  public async run({
    prismaService,
    prismaDmobService,
    prometheusMetricService,
  }: AggregationRunnerRunServices): Promise<void> {
    const runnerName = this.getName();
    const {
      startGetDataTimerByRunnerNameMetric,
      startStoreDataTimerByRunnerNameMetric,
    } = prometheusMetricService.aggregateMetrics;

    const getDataEndTimerMetric =
      startGetDataTimerByRunnerNameMetric(runnerName);

    const result = await prismaDmobService.$queryRawTyped(
      getOldDatacapBalanceNv22(),
    );

    getDataEndTimerMetric();

    const data = result.map((dmobResult) => ({
      allocator: dmobResult.allocator,
      old_dc_balance: dmobResult.old_dc_balance,
    }));

    const storeDataEndTimerMetric =
      startStoreDataTimerByRunnerNameMetric(runnerName);

    await prismaService.$executeRaw`delete from old_datacap_balance_nv22;`;
    await prismaService.old_datacap_balance_nv22.createMany({ data });

    storeDataEndTimerMetric();
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.OldDatacapBalanceNv22];
  }

  getDependingTables(): AggregationTable[] {
    return [];
  }

  getName(): string {
    return 'Old Datacap Balance Nv22 Runner';
  }
}
