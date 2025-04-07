import { getCidSharing } from 'prismaDmob/generated/client/sql';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';

export class CidSharingRunner implements AggregationRunner {
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
      CidSharingRunner.name,
    );

    const result = await prismaDmobService.$queryRawTyped(getCidSharing());

    getDataEndTimerMetric();

    const data = result.map((dmobResult) => ({
      client: dmobResult.client,
      other_client: dmobResult.other_client,
      total_deal_size: dmobResult.total_deal_size,
      unique_cid_count: dmobResult.unique_cid_count,
    }));

    const storeDataEndTimerMetric = startStoreDataTimerByRunnerNameMetric(
      CidSharingRunner.name,
    );

    await prismaService.$executeRaw`delete from cid_sharing;`;
    await prismaService.cid_sharing.createMany({ data });

    storeDataEndTimerMetric();
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.CidSharing];
  }

  getDependingTables(): AggregationTable[] {
    return [];
  }
}
