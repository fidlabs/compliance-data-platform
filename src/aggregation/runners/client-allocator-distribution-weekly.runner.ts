import { getClientAllocatorDistributionWeekly } from 'prismaDmob/generated/client/sql';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';

export class ClientAllocatorDistributionWeeklyRunner
  implements AggregationRunner
{
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
      ClientAllocatorDistributionWeeklyRunner.name,
    );

    const result = await prismaDmobService.$queryRawTyped(
      getClientAllocatorDistributionWeekly(),
    );

    getDataEndTimerMetric();

    const data = result.map((dmobResult) => ({
      week: dmobResult.week,
      client: dmobResult.client,
      allocator: dmobResult.allocator,
      num_of_allocations: dmobResult.num_of_allocations,
      sum_of_allocations: dmobResult.sum_of_allocations,
    }));

    const storeDataEndTimerMetric = startStoreDataTimerByRunnerNameMetric(
      ClientAllocatorDistributionWeeklyRunner.name,
    );

    await prismaService.$executeRaw`delete from client_allocator_distribution_weekly;`;
    await prismaService.client_allocator_distribution_weekly.createMany({
      data,
    });

    storeDataEndTimerMetric();
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.ClientAllocatorDistributionWeekly];
  }

  getDependingTables(): AggregationTable[] {
    return [];
  }
}
