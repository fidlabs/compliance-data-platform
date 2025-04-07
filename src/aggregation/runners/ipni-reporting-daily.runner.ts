import { DateTime } from 'luxon';
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

    const getDataEndTimerMetric = startGetDataTimerByRunnerNameMetric(
      IpniReportingDailyRunner.name,
    );

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

    const yesterday = DateTime.now()
      .setZone('UTC')
      .minus({ days: 1 })
      .startOf('day');

    if (latestStoredDate >= yesterday) {
      return;
    }

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
