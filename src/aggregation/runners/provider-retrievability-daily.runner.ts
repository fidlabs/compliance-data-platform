import { DateTime } from 'luxon';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';

export class ProviderRetrievabilityDailyRunner implements AggregationRunner {
  public async run({
    prismaService,
    filSparkService,
    prometheusMetricService,
  }: AggregationRunnerRunServices): Promise<void> {
    const {
      startGetDataTimerByRunnerNameMetric,
      startStoreDataTimerByRunnerNameMetric,
    } = prometheusMetricService.aggregateMetrics;

    const getDataEndTimerMetric = startGetDataTimerByRunnerNameMetric(
      ProviderRetrievabilityDailyRunner.name,
    );

    const latestStored =
      await prismaService.provider_retrievability_daily.findFirst({
        select: {
          date: true,
        },
        orderBy: {
          date: 'desc',
        },
      });

    const latestStoredDate = latestStored
      ? DateTime.fromJSDate(latestStored.date, { zone: 'UTC' })
      : null;

    const yesterday = DateTime.now()
      .setZone('UTC')
      .minus({ days: 1 })
      .startOf('day');

    if (latestStoredDate >= yesterday) {
      // already downloaded yesterday's retrievability, wait for next day
      return;
    }

    const retrievabilityData =
      await filSparkService.fetchRetrievability(yesterday);

    getDataEndTimerMetric();

    const data = retrievabilityData.map((row) => ({
      date: yesterday.toJSDate(),
      provider: row.miner_id,
      total: parseInt(row.total),
      successful: parseInt(row.successful),
      success_rate: row.success_rate,
      successful_http: parseInt(row.successful_http),
      success_rate_http: row.success_rate_http,
    }));

    const storeDataEndTimerMetric = startStoreDataTimerByRunnerNameMetric(
      ProviderRetrievabilityDailyRunner.name,
    );

    await prismaService.provider_retrievability_daily.createMany({ data });

    storeDataEndTimerMetric();
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.ProviderRetrievabilityDaily];
  }

  getDependingTables(): AggregationTable[] {
    return [];
  }
}
