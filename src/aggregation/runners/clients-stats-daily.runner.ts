import { Logger } from '@nestjs/common';
import { DateTime } from 'luxon';
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
    interface ClientsWithDealsResult {
      client_id: string;
    }

    const [clientsWithDealsResults, clientsResults] = await Promise.all([
      prismaDmobService.$queryRaw<ClientsWithDealsResult[]>`
        SELECT DISTINCT 'f0' || "clientId" AS client_id
        FROM dc_allocation_claim
        WHERE "type" <> 'allocation'
      `,
      prismaService.client.findMany({
        select: {
          id: true,
          datacap_remaining: true,
        },
      }),
    ]);

    const remainingDatacapPairs = clientsResults.map((result) => {
      return [result.id, result.datacap_remaining] as const;
    });
    const remainingDatacapMap = new Map(remainingDatacapPairs);
    const totalRemainingClientsDatacap = clientsResults.reduce(
      (total, clientResult) => {
        return total + clientResult.datacap_remaining;
      },
      0n,
    );

    const clientsWithDealsAndDatacapCount = clientsWithDealsResults.filter(
      ({ client_id }) => {
        const remainingDatacap = remainingDatacapMap.get(client_id) ?? 0n;
        return remainingDatacap > 0n;
      },
    ).length;

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
          clients_with_active_deals: clientsWithDealsResults.length,
          clients_who_have_dc_and_deals: clientsWithDealsAndDatacapCount,
          total_remaining_clients_datacap: totalRemainingClientsDatacap,
        },
      }),
    ]);

    storeDataEndTimerMetric();
  }

  getFilledTables() {
    return [AggregationTable.ClientsStatsDaily];
  }

  getDependingTables() {
    return [AggregationTable.Client];
  }
}
