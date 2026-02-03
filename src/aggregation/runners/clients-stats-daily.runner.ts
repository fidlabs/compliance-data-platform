import { Logger } from '@nestjs/common';
import { DateTime } from 'luxon';
import { prepareClientsStats } from 'prismaDmob/generated/client/sql';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';

export class ClientsStatsDailyRunner implements AggregationRunner {
  private readonly logger = new Logger(ClientsStatsDailyRunner.name);

  public async run({
    prismaService,
    prismaDmobService,
    prometheusMetricService,
  }: AggregationRunnerRunServices): Promise<void> {
    const {
      startGetDataTimerByRunnerNameMetric,
      startStoreDataTimerByRunnerNameMetric,
    } = prometheusMetricService.aggregateMetrics;

    const getDataEndTimerMetric = startGetDataTimerByRunnerNameMetric(
      ClientsStatsDailyRunner.name,
    );

    const [result] = await prismaDmobService.$queryRawTyped(
      prepareClientsStats(),
    );

    // Should never happen
    if (!result) {
      this.logger.warn('No results for clients stats, please investigate.');
    }

    const todayUTC = DateTime.utc().startOf('day').toJSDate();

    getDataEndTimerMetric();

    const storeDataEndTimerMetric = startStoreDataTimerByRunnerNameMetric(
      ClientsStatsDailyRunner.name,
    );

    await prismaService.$transaction([
      prismaService.clients_stats_daily.deleteMany({
        where: {
          date: todayUTC,
        },
      }),
      prismaService.clients_stats_daily.create({
        data: {
          date: todayUTC,
          clients_with_active_deals: result.clients_with_active_deals,
          clients_who_have_dc_and_deals: result.clients_who_have_dc_and_deals,
          total_remaining_clients_datacap: result.total_remaining_datacap,
        },
      }),
    ]);

    storeDataEndTimerMetric();
  }

  getFilledTables() {
    return [AggregationTable.ClientsStatsDaily];
  }

  getDependingTables() {
    return [];
  }
}
