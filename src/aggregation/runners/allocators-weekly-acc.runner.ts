import { Logger } from '@nestjs/common';
import { QueryIterablePool } from 'pg-iterator';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';

export class AllocatorsWeeklyAccRunner implements AggregationRunner {
  private readonly logger = new Logger(AllocatorsWeeklyAccRunner.name);

  public async run({
    prismaService,
    postgresService,
    prometheusMetricService,
  }: AggregationRunnerRunServices): Promise<void> {
    const {
      startGetDataTimerByRunnerNameMetric,
      startStoreDataTimerByRunnerNameMetric,
    } = prometheusMetricService.aggregateMetrics;

    await prismaService.$transaction(
      async (tx) => {
        const queryIterablePool = new QueryIterablePool<{
          week: Date;
          allocator: string;
          num_of_clients: number | null;
          biggest_client_sum_of_allocations: bigint | null;
          total_sum_of_allocations: bigint | null;
          avg_weighted_retrievability_success_rate: number | null;
          avg_weighted_retrievability_success_rate_http: number | null;
        }>(postgresService.pool);

        const getDataEndTimerMetric = startGetDataTimerByRunnerNameMetric(
          AllocatorsWeeklyAccRunner.name,
        );

        const i = queryIterablePool.query(`with
                             allocator_retrievability as (
                                 select
                                     week,
                                     allocator,
                                     sum(cpdwa.total_deal_size*coalesce(avg_retrievability_success_rate, 0))/sum(cpdwa.total_deal_size) as avg_weighted_retrievability_success_rate,
                                     sum(cpdwa.total_deal_size*coalesce(avg_retrievability_success_rate_http, 0))/sum(cpdwa.total_deal_size) as avg_weighted_retrievability_success_rate_http
                                 from client_allocator_distribution_weekly_acc
                                          inner join client_provider_distribution_weekly_acc as cpdwa
                                                     using (client, week)
                                          left join providers_weekly using (provider, week)
                                 group by
                                     week,
                                     allocator
                             )
                         select
                             week,
                             allocator,
                             count(*)::int as num_of_clients,
                             max(sum_of_allocations)::bigint as biggest_client_sum_of_allocations,
                             sum(sum_of_allocations)::bigint as total_sum_of_allocations,
                             max(coalesce(avg_weighted_retrievability_success_rate, 0)) as avg_weighted_retrievability_success_rate,
                             max(coalesce(avg_weighted_retrievability_success_rate_http, 0)) as avg_weighted_retrievability_success_rate_http
                         from client_allocator_distribution_weekly_acc
                                  left join allocator_retrievability
                                            using (week, allocator)
                         group by
                             week,
                             allocator;`);

        const data: {
          week: Date;
          allocator: string;
          num_of_clients: number | null;
          biggest_client_sum_of_allocations: bigint | null;
          total_sum_of_allocations: bigint | null;
          avg_weighted_retrievability_success_rate: number | null;
          avg_weighted_retrievability_success_rate_http: number | null;
        }[] = [];

        let isFirstInsert = true;
        let storeDataEndTimerMetric;

        for await (const rowResult of i) {
          data.push({
            week: rowResult.week,
            allocator: rowResult.allocator,
            num_of_clients: rowResult.num_of_clients,
            biggest_client_sum_of_allocations:
              rowResult.biggest_client_sum_of_allocations,
            total_sum_of_allocations: rowResult.total_sum_of_allocations,
            avg_weighted_retrievability_success_rate:
              rowResult.avg_weighted_retrievability_success_rate,
            avg_weighted_retrievability_success_rate_http:
              rowResult.avg_weighted_retrievability_success_rate_http,
          });

          if (data.length === 5000) {
            if (isFirstInsert) {
              isFirstInsert = false;
              getDataEndTimerMetric();
              storeDataEndTimerMetric = startStoreDataTimerByRunnerNameMetric(
                AllocatorsWeeklyAccRunner.name,
              );
              await tx.$executeRaw`delete from allocators_weekly_acc`;
            }

            await tx.allocators_weekly_acc.createMany({
              data,
            });

            data.length = 0;
          }
        }

        if (data.length > 0) {
          if (isFirstInsert) {
            getDataEndTimerMetric();
            storeDataEndTimerMetric = startStoreDataTimerByRunnerNameMetric(
              AllocatorsWeeklyAccRunner.name,
            );

            await tx.$executeRaw`delete from allocators_weekly_acc`;
          }

          await tx.allocators_weekly_acc.createMany({
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
    return [AggregationTable.AllocatorsWeeklyAcc];
  }

  getDependingTables(): AggregationTable[] {
    return [
      AggregationTable.ClientProviderDistributionWeeklyAcc,
      AggregationTable.ProvidersWeekly,
      AggregationTable.ClientAllocatorDistributionWeeklyAcc,
    ];
  }
}
