import { DateTime } from 'luxon';
import { isTodayUTC } from 'src/utils/utils';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';

export class IpniReportingDailyRunner implements AggregationRunner {
  public async run({
    prismaService,
    prometheusMetricService,
    ipniMisreportingCheckerService,
  }: AggregationRunnerRunServices): Promise<void> {
    const {
      startGetDataTimerByRunnerNameMetric,
      startStoreDataTimerByRunnerNameMetric,
    } = prometheusMetricService.aggregateMetrics;

    const latestStored = await prismaService.ipni_reporting_daily.findFirst({
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

    // skip if we already did aggregation today
    if (!!latestStoredDate && isTodayUTC(latestStoredDate)) {
      return;
    }

    const getDataEndTimerMetric = startGetDataTimerByRunnerNameMetric(
      IpniReportingDailyRunner.name,
    );

    const result =
      await ipniMisreportingCheckerService.getAggregatedProvidersReportingStatus();

    const data = {
      not_reporting: result.notReporting,
      misreporting: result.misreporting,
      ok: result.ok,
      total: result.total,
    };

    getDataEndTimerMetric();

    const storeDataEndTimerMetric = startStoreDataTimerByRunnerNameMetric(
      IpniReportingDailyRunner.name,
    );

    await prismaService.ipni_reporting_daily.create({ data });

    storeDataEndTimerMetric();
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.IpniReportingDaily];
  }

  getDependingTables(): AggregationTable[] {
    return [AggregationTable.ClientProviderDistribution];
  }
}
