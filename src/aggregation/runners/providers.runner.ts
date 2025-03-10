import { Logger } from '@nestjs/common';
import { getProvidersWeekly } from 'prisma/generated/client/sql';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';

export class ProvidersRunner implements AggregationRunner {
  private readonly logger = new Logger(ProvidersRunner.name);

  public async run({
    prismaService,
    prometheusMetricService,
  }: AggregationRunnerRunServices): Promise<void> {
    const runnerName = this.getName();

    const {
      startGetDataTimerByRunnerNameMetric,
      startStoreDataTimerByRunnerNameMetric,
    } = prometheusMetricService.aggregateMetrics;

    const getDataEndTimerMetric =
      startGetDataTimerByRunnerNameMetric(runnerName);

    const result = await prismaService.$queryRawTyped(getProvidersWeekly());

    getDataEndTimerMetric();
    const data = result.map((row) => ({
      week: row.week,
      provider: row.provider,
      num_of_clients: row.num_of_clients,
      biggest_client_total_deal_size: row.biggest_client_total_deal_size,
      total_deal_size: row.total_deal_size,
      avg_retrievability_success_rate: row.avg_retrievability_success_rate,
      avg_retrievability_success_rate_http:
        row.avg_retrievability_success_rate_http,
    }));

    const storeDataEndTimerMetric =
      startStoreDataTimerByRunnerNameMetric(runnerName);

    await prismaService.$executeRaw`delete from providers_weekly;`;
    await prismaService.providers_weekly.createMany({ data });
    storeDataEndTimerMetric();
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.ProvidersWeekly];
  }

  getDependingTables(): AggregationTable[] {
    return [
      AggregationTable.ClientProviderDistributionWeekly,
      AggregationTable.ProviderRetrievabilityDaily,
    ];
  }

  getName(): string {
    return 'Providers Runner';
  }
}
