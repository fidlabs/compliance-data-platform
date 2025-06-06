import { Logger } from '@nestjs/common';
import { getAllocatorsWeekly } from 'prisma/generated/client/sql';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';

export class AllocatorsWeeklyRunner implements AggregationRunner {
  private readonly logger = new Logger(AllocatorsWeeklyRunner.name);

  public async run({
    prismaService,
    prometheusMetricService,
  }: AggregationRunnerRunServices): Promise<void> {
    const {
      startGetDataTimerByRunnerNameMetric,
      startStoreDataTimerByRunnerNameMetric,
    } = prometheusMetricService.aggregateMetrics;

    const getDataEndTimerMetric = startGetDataTimerByRunnerNameMetric(
      AllocatorsWeeklyRunner.name,
    );

    const result = await prismaService.$queryRawTyped(getAllocatorsWeekly());

    getDataEndTimerMetric();

    const data = result.map((row) => ({
      week: row.week,
      allocator: row.allocator,
      num_of_clients: row.num_of_clients,
      biggest_client_sum_of_allocations: row.biggest_client_sum_of_allocations,
      total_sum_of_allocations: row.total_sum_of_allocations,
      avg_weighted_retrievability_success_rate:
        row.avg_weighted_retrievability_success_rate,
      avg_weighted_retrievability_success_rate_http:
        row.avg_weighted_retrievability_success_rate_http,
    }));

    const storeDataEndTimerMetric = startStoreDataTimerByRunnerNameMetric(
      AllocatorsWeeklyRunner.name,
    );

    await prismaService.$executeRaw`delete from allocators_weekly;`;
    await prismaService.allocators_weekly.createMany({ data });

    storeDataEndTimerMetric();
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.AllocatorsWeekly];
  }

  getDependingTables(): AggregationTable[] {
    return [
      AggregationTable.ClientProviderDistributionWeekly,
      AggregationTable.ProvidersWeekly,
      AggregationTable.ClientAllocatorDistributionWeekly,
    ];
  }
}
