import { Logger } from '@nestjs/common';
import { getProvidersWeeklyAcc } from '../../../prisma/generated/client/sql';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';

export class ProvidersAccRunner implements AggregationRunner {
  private readonly logger = new Logger(ProvidersAccRunner.name);

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
    }));

    const storeDataEndTimerMetric =
      startStoreDataTimerByRunnerNameMetric(runnerName);

    await prismaService.$executeRaw`truncate providers_weekly_acc;`;
    this.logger.log('Truncated providers_weekly_acc');
    await prismaService.providers_weekly_acc.createMany({ data });
    this.logger.log('Inserted providers_weekly_acc');
    storeDataEndTimerMetric();
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.ProvidersWeeklyAcc];
  }

  getDependingTables(): AggregationTable[] {
    return [
      AggregationTable.ClientProviderDistributionWeeklyAcc,
      AggregationTable.ProviderRetrievabilityDaily,
    ];
  }

  getName(): string {
    return 'Providers Acc Runner';
  }
}
