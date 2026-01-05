import { Logger } from '@nestjs/common';
import { DateTime } from 'luxon';
import { allocator_client_stats_daily } from 'prisma/generated/client';
import { getAllocatorsClientsStats } from 'prisma/generated/client/sql';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';

export class AllocatorsClientStatsDailyRunner implements AggregationRunner {
  private readonly logger = new Logger(AllocatorsClientStatsDailyRunner.name);

  public async run({
    prismaService,
    prometheusMetricService,
  }: AggregationRunnerRunServices): Promise<void> {
    const {
      startGetDataTimerByRunnerNameMetric,
      startStoreDataTimerByRunnerNameMetric,
    } = prometheusMetricService.aggregateMetrics;

    const getDataEndTimerMetric = startGetDataTimerByRunnerNameMetric(
      AllocatorsClientStatsDailyRunner.name,
    );

    const results = await prismaService.$queryRawTyped(
      getAllocatorsClientsStats(),
    );
    const todayUTC = DateTime.utc().startOf('day').toJSDate();

    const entries = results.map<allocator_client_stats_daily>((result) => {
      return {
        ...result,
        // eslint-disable-next-line no-restricted-syntax
        number_of_clients: Number(result.number_of_clients),
        date: todayUTC,
      };
    });

    getDataEndTimerMetric();

    const storeDataEndTimerMetric = startStoreDataTimerByRunnerNameMetric(
      AllocatorsClientStatsDailyRunner.name,
    );

    await prismaService.$transaction([
      prismaService.allocator_client_stats_daily.deleteMany({
        where: {
          date: todayUTC,
        },
      }),
      prismaService.allocator_client_stats_daily.createMany({
        data: entries,
      }),
    ]);

    storeDataEndTimerMetric();
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.AllocatorsClientStatsDaily];
  }

  getDependingTables(): AggregationTable[] {
    return [
      AggregationTable.Allocator,
      AggregationTable.AllocatorRegistry,
      AggregationTable.AllocatorRegistryArchive,
      AggregationTable.ClientDatacapAllocation,
      AggregationTable.UnifiedVerifiedDealHourly,
    ];
  }
}
