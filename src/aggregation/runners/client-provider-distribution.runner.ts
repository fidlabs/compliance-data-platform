import { getClientProviderDistribution } from '../../../prismaDmob/generated/client/sql';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';

export class ClientProviderDistributionRunner implements AggregationRunner {
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
      getClientProviderDistribution(),
    );

    getDataEndTimerMetric();

    const data = result.map((dmobResult) => ({
      client: dmobResult.client,
      provider: dmobResult.provider,
      total_deal_size: dmobResult.total_deal_size,
      unique_data_size: dmobResult.unique_data_size,
      claims_count: dmobResult.claims_count,
    }));

    const storeDataEndTimerMetric =
      prometheusMetricService.allocatorReportGeneratorMetrics.startStoreDataTimerByRunnerNameMetric(
        runnerName,
      );

    await prismaService.$executeRaw`truncate client_provider_distribution;`;
    await prismaService.client_provider_distribution.createMany({
      data,
    });

    storeDataEndTimerMetric();
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.ClientProviderDistribution];
  }

  getDependingTables(): AggregationTable[] {
    return [];
  }

  getName(): string {
    return 'Client/Provider Distribution Runner';
  }
}
