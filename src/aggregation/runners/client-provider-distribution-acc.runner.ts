import { QueryIterablePool } from 'pg-iterator';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';

export class ClientProviderDistributionAccRunner implements AggregationRunner {
  public async run({
    prismaService,
    postgresDmobService,
    prometheusMetricService,
  }: AggregationRunnerRunServices): Promise<void> {
    const runnerName = this.getName();

    await prismaService.$transaction(
      async (tx) => {
        const getDataEndTimerMetric =
          prometheusMetricService.allocatorReportGeneratorMetrics.startGetDataTimerByRunnerNameMetric(
            runnerName,
          );

        const queryIterablePool = new QueryIterablePool<{
          week: Date | null;
          client: string | null;
          provider: string | null;
          total_deal_size: bigint | null;
          unique_data_size: bigint | null;
        }>(postgresDmobService.pool);

        const i = queryIterablePool.query(`with miner_pieces
                                                  as (select date_trunc('week', to_timestamp("termStart" * 30 + 1598306400)) as week,
                                                             'f0' || "clientId"                                              as client,
                                                             'f0' || "providerId"                                            as provider,
                                                             "pieceCid",
                                                             sum("pieceSize")                                                as total_deal_size,
                                                             min("pieceSize")                                                as piece_size
                                                      from unified_verified_deal
                                                      where "termStart" >= 3847920                                           -- nv22 start
                                                        and to_timestamp("termStart" * 30 + 1598306400) <= current_timestamp -- deals that didn't start yet
                                                      group by week,
                                                               client,
                                                               provider,
                                                               "pieceCid"),
                                              weeks as (select date_trunc('week', dates) week
                                                        from generate_series(
                                                                     to_timestamp(3847920 * 30 + 1598306400),
                                                                     current_timestamp,
                                                                     '1 week'::interval) dates)
                                         select weeks.week                   as week,
                                                client,
                                                provider,
                                                sum(total_deal_size)::bigint as total_deal_size,
                                                sum(piece_size)::bigint      as unique_data_size
                                         from weeks
                                                  inner join miner_pieces
                                                             on weeks.week >= miner_pieces.week
                                         group by weeks.week,
                                                  client,
                                                  provider;`);

        getDataEndTimerMetric();

        const data: {
          week: Date | null;
          client: string | null;
          provider: string | null;
          total_deal_size: bigint | null;
          unique_data_size: bigint | null;
        }[] = [];

        let isFirstInsert = true;

        const storeDataEndTimerMetric =
          prometheusMetricService.allocatorReportGeneratorMetrics.startStoreDataTimerByRunnerNameMetric(
            runnerName,
          );

        for await (const rowResult of i) {
          data.push({
            week: rowResult.week,
            client: rowResult.client,
            provider: rowResult.provider,
            total_deal_size: rowResult.total_deal_size,
            unique_data_size: rowResult.unique_data_size,
          });

          if (data.length === 5000) {
            if (isFirstInsert) {
              await tx.$executeRaw`truncate client_provider_distribution_weekly_acc`;
              isFirstInsert = false;
            }

            await tx.client_provider_distribution_weekly_acc.createMany({
              data,
            });

            data.length = 0;
          }
        }

        if (data.length > 0) {
          if (isFirstInsert) {
            await tx.$executeRaw`truncate client_provider_distribution_weekly_acc`;
          }
          await tx.client_provider_distribution_weekly_acc.createMany({
            data,
          });
        }
        storeDataEndTimerMetric();
      },
      {
        timeout: Number.MAX_SAFE_INTEGER,
      },
    );
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.ClientProviderDistributionWeeklyAcc];
  }

  getDependingTables(): AggregationTable[] {
    return [];
  }

  getName(): string {
    return 'Client/Provider Distribution Acc Runner';
  }
}
