import { Logger } from '@nestjs/common';
import { DateTime } from 'luxon';
import { getClientProviderDistributionAccSingleWeek } from 'prismaDmob/generated/client/sql';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';

export class ClientProviderDistributionWeeklyAccRunner implements AggregationRunner {
  private readonly logger = new Logger(
    ClientProviderDistributionWeeklyAccRunner.name,
  );

  public async run({
    prismaService,
    prismaDmobService,
    prometheusMetricService,
  }: AggregationRunnerRunServices): Promise<void> {
    const {
      startGetDataTimerByRunnerNameMetric,
      startStoreDataTimerByRunnerNameMetric,
    } = prometheusMetricService.aggregateMetrics;

    const latestStored =
      await prismaService.client_provider_distribution_weekly_acc.findFirst({
        select: {
          week: true,
        },
        orderBy: {
          week: 'desc',
        },
      });

    let nextWeek = latestStored
      ? DateTime.fromJSDate(latestStored.week, { zone: 'UTC' }) // we want to reprocess the last stored week, as it might've been incomplete
      : DateTime.fromSeconds(3698160 * 30 + 1598306400).startOf('week'); // current fil+ edition start week - a.k.a. reprocess everything

    const now = DateTime.now().setZone('UTC');

    while (nextWeek <= now) {
      this.logger.debug(`Processing week ${nextWeek}`);

      const weekDate = nextWeek.toJSDate();

      const getDataEndTimerMetric = startGetDataTimerByRunnerNameMetric(
        ClientProviderDistributionWeeklyAccRunner.name,
      );

      const result = await prismaDmobService.$queryRawTyped(
        getClientProviderDistributionAccSingleWeek(weekDate),
      );

      getDataEndTimerMetric();

      const storeDataEndTimerMetric = startStoreDataTimerByRunnerNameMetric(
        ClientProviderDistributionWeeklyAccRunner.name,
      );

      const newData = result.map((dmobResult) => ({
        week: weekDate,
        client: dmobResult.client,
        provider: dmobResult.provider,
        total_deal_size: dmobResult.total_deal_size,
        unique_data_size: dmobResult.unique_data_size,
      }));

      await prismaService.$transaction(async (tx) => {
        await tx.$executeRaw`
          TRUNCATE TABLE client_provider_distribution_weekly_acc_sync_source
        `;

        await tx.client_provider_distribution_weekly_acc_sync_source.createMany(
          {
            data: newData,
            skipDuplicates: false,
          },
        );

        await tx.$executeRaw`
          MERGE INTO client_provider_distribution_weekly_acc AS target
          USING client_provider_distribution_weekly_acc_sync_source AS source
          ON (target.week = source.week AND target.client = source.client AND target.provider = source.provider)
          WHEN MATCHED
            AND (
              target.total_deal_size <> source.total_deal_size
            OR
              target.unique_data_size <> source.unique_data_size
          ) THEN
            UPDATE SET
              total_deal_size = source.total_deal_size,
              unique_data_size = source.unique_data_size
          WHEN NOT MATCHED THEN
            INSERT (week, client, provider, total_deal_size, unique_data_size)
            VALUES (source.week, source.client, source.provider, source.total_deal_size, source.unique_data_size)
          WHEN NOT MATCHED BY SOURCE AND target.week = ${weekDate} THEN
            DELETE;
        `;
      });

      storeDataEndTimerMetric();
      nextWeek = nextWeek.plus({ weeks: 1 });
    }
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.ClientProviderDistributionWeeklyAcc];
  }

  getDependingTables(): AggregationTable[] {
    return [];
  }
}
