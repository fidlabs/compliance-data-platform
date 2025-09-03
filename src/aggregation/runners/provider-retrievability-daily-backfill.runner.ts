import { DateTime } from 'luxon';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';
import { stringToNumber } from 'src/utils/utils';

export class ProviderRetrievabilityDailyBackfillRunner
  implements AggregationRunner
{
  // will fetch 1 day worth of data each run until everything is backfilled
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
      ProviderRetrievabilityDailyBackfillRunner.name,
    );

    const retrieved =
      await prismaService.provider_retrievability_daily.findMany({
        distinct: ['date'],
        select: {
          date: true,
        },
        orderBy: {
          date: 'desc',
        },
      });

    if (!retrieved.length) return;

    const retrievedUtc = retrieved.map((v) =>
      DateTime.fromJSDate(v.date, { zone: 'UTC' }),
    );

    const cutoff = DateTime.fromISO('2024-03-01T00:00:00', { zone: 'UTC' }); // current fil+ edition start

    let latestStored = retrievedUtc[0];
    let backfillDate = null;

    while (latestStored !== cutoff) {
      const next = latestStored.minus({ days: 1 });

      if (!retrievedUtc.find((v) => v.equals(next))) {
        backfillDate = next;
        break;
      }

      latestStored = next;
    }

    if (!backfillDate) return;

    const retrievabilityData =
      await filSparkService.fetchRetrievability(backfillDate);

    getDataEndTimerMetric();

    const data = retrievabilityData.map((row) => ({
      date: backfillDate.toJSDate(),
      provider: row.miner_id,
      total: stringToNumber(row.total),
      successful: stringToNumber(row.successful),
      success_rate: row.success_rate,
      successful_http: stringToNumber(row.successful_http),
      success_rate_http: row.success_rate_http,
    }));

    const storeDataEndTimerMetric = startStoreDataTimerByRunnerNameMetric(
      ProviderRetrievabilityDailyBackfillRunner.name,
    );

    await prismaService.provider_retrievability_daily.createMany({ data });

    storeDataEndTimerMetric();
  }

  getFilledTables(): AggregationTable[] {
    return [];
  }

  getDependingTables(): AggregationTable[] {
    return [];
  }
}
