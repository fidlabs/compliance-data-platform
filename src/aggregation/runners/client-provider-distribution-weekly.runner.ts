import { getClientProviderDistributionWeekly } from '../../../prismaDmob/generated/client/sql';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';

export class ClientProviderDistributionWeeklyRunner
  implements AggregationRunner
{
  public async run({
    prismaService,
    prismaDmobService,
    prometheusMetricService,
  }: AggregationRunnerRunServices): Promise<void> {
    const runnerName = this.getName();

    const getDataEndTimerMetric =
      prometheusMetricService.allocatorReportGeneratorMetrics.startGetDataTimerByRunnerNameMetric(
        runnerName,
      );

    const result = await prismaDmobService.$queryRawTyped(
      getClientProviderDistributionWeekly(),
    );

    getDataEndTimerMetric();

    const data = result.map((dmobResult) => ({
      week: dmobResult.week,
      client: dmobResult.client,
      provider: dmobResult.provider,
      total_deal_size: dmobResult.total_deal_size,
      unique_data_size: dmobResult.unique_data_size,
    }));

    const storeDataEndTimerMetric =
      prometheusMetricService.allocatorReportGeneratorMetrics.startStoreDataTimerByRunnerNameMetric(
        runnerName,
      );

    await prismaService.$executeRaw`truncate client_provider_distribution_weekly;`;
    await prismaService.client_provider_distribution_weekly.createMany({
      data,
    });

    storeDataEndTimerMetric();
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.ClientProviderDistributionWeekly];
  }

  getDependingTables(): AggregationTable[] {
    return [];
  }

  getName(): string {
    return 'Client/Provider Distribution Weekly Runner';
  }
}
