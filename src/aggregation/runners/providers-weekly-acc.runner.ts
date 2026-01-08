import { Logger } from '@nestjs/common';
import { getProvidersWeeklyAcc } from 'prisma/generated/client/sql';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';

export class ProvidersWeeklyAccRunner implements AggregationRunner {
  private readonly logger = new Logger(ProvidersWeeklyAccRunner.name);

  public async run({
    prismaService,
    prometheusMetricService,
  }: AggregationRunnerRunServices): Promise<void> {
    const {
      startGetDataTimerByRunnerNameMetric,
      startStoreDataTimerByRunnerNameMetric,
    } = prometheusMetricService.aggregateMetrics;

    const getDataEndTimerMetric = startGetDataTimerByRunnerNameMetric(
      ProvidersWeeklyAccRunner.name,
    );

    const result = await prismaService.$queryRawTyped(getProvidersWeeklyAcc());

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
      avg_retrievability_success_rate_url_finder:
        row.avg_retrievability_success_rate_url_finder,
    }));

    const storeDataEndTimerMetric = startStoreDataTimerByRunnerNameMetric(
      ProvidersWeeklyAccRunner.name,
    );

    await prismaService.$executeRaw`delete from providers_weekly_acc;`;
    await prismaService.providers_weekly_acc.createMany({ data: data });
    storeDataEndTimerMetric();
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.ProvidersWeeklyAcc];
  }

  getDependingTables(): AggregationTable[] {
    return [
      AggregationTable.ClientProviderDistributionWeeklyAcc,
      AggregationTable.ProviderUrlFinderRetrievabilityDaily,
    ];
  }
}
