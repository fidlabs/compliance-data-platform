import { Logger } from '@nestjs/common';
import { QueryIterablePool } from 'pg-iterator';
import { getAllocatorRetrievabilityWeekly } from 'prisma/generated/client/sql';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';

class AllocatorWeekly {
  week: Date;
  allocator: string;
  num_of_clients: number | null;
  biggest_client_sum_of_allocations: bigint | null;
  total_sum_of_allocations: bigint | null;
  avg_weighted_retrievability_success_rate: number | null;
  avg_weighted_retrievability_success_rate_http: number | null;
  avg_weighted_retrievability_success_rate_url_finder: number | null;
}

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
        const queryIterablePool = new QueryIterablePool<AllocatorWeekly>(
          postgresService.pool,
        );

        const getDataEndTimerMetric = startGetDataTimerByRunnerNameMetric(
          AllocatorsWeeklyAccRunner.name,
        );

        const result = queryIterablePool.query(
          getAllocatorRetrievabilityWeekly().sql,
        );

        const data: AllocatorWeekly[] = [];

        let isFirstInsert = true;
        let storeDataEndTimerMetric;

        for await (const rowResult of result) {
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
            avg_weighted_retrievability_success_rate_url_finder:
              rowResult.avg_weighted_retrievability_success_rate_url_finder,
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
              data: data,
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
            data: data,
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
