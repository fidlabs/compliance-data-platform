import { getProviderFirstClient } from '../../../prisma/generated/client/sql';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';

export class ProviderFirstClientRunner implements AggregationRunner {
  public async run({
    prismaService,
    prometheusMetricService,
  }: AggregationRunnerRunServices): Promise<void> {
    const runnerName = this.getName();

    const getDataEndTimerMetric =
      prometheusMetricService.allocatorMetrics.startGetDataTimerByRunnerNameMetric(
        runnerName,
      );

    const result = await prismaService.$queryRawTyped(getProviderFirstClient());

    getDataEndTimerMetric();

    const data = result.map((row) => ({
      provider: row.provider,
      first_client: row.first_client,
    }));

    const storeDataEndTimerMetric =
      prometheusMetricService.allocatorMetrics.startStoreDataTimerByRunnerNameMetric(
        runnerName,
      );

    await prismaService.$executeRaw`truncate provider_first_client;`;
    await prismaService.provider_first_client.createMany({ data });

    storeDataEndTimerMetric();
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.ProviderFirstClient];
  }

  getDependingTables(): AggregationTable[] {
    return [AggregationTable.UnifiedVerifiedDealHourly];
  }

  getName(): string {
    return 'Provider First Client Runner';
  }
}
