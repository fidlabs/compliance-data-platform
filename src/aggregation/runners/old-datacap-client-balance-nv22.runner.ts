import { getOldDatacapClientBalanceNv22 } from 'prismaDmob/generated/client/sql';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';

export class OldDatacapClientBalanceNv22Runner implements AggregationRunner {
  public async run({
    prismaService,
    prismaDmobService,
    prometheusMetricService,
  }: AggregationRunnerRunServices): Promise<void> {
    const {
      startGetDataTimerByRunnerNameMetric,
      startStoreDataTimerByRunnerNameMetric,
    } = prometheusMetricService.aggregateMetrics;

    const getDataEndTimerMetric = startGetDataTimerByRunnerNameMetric(
      OldDatacapClientBalanceNv22Runner.name,
    );

    const result = await prismaDmobService.$queryRawTyped(
      getOldDatacapClientBalanceNv22(),
    );

    getDataEndTimerMetric();

    const data = result.map((dmobResult) => ({
      client: dmobResult.client,
      old_dc_balance: dmobResult.old_dc_balance,
    }));

    const storeDataEndTimerMetric = startStoreDataTimerByRunnerNameMetric(
      OldDatacapClientBalanceNv22Runner.name,
    );

    await prismaService.$executeRaw`delete from old_datacap_client_balance_nv22;`;
    await prismaService.old_datacap_client_balance_nv22.createMany({ data });

    storeDataEndTimerMetric();
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.OldDatacapClientBalanceNv22];
  }

  getDependingTables(): AggregationTable[] {
    return [];
  }
}
