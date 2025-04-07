import { getClientAllocatorDistributionWeeklyAcc } from 'prismaDmob/generated/client/sql';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';

export class ClientAllocatorDistributionWeeklyAccRunner
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
      ClientAllocatorDistributionWeeklyAccRunner.name,
    );

    const result = await prismaDmobService.$queryRawTyped(
      getClientAllocatorDistributionWeeklyAcc(),
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
      ClientAllocatorDistributionWeeklyAccRunner.name,
    );

    await prismaService.$executeRaw`delete from client_allocator_distribution_weekly_acc;`;
    await prismaService.client_allocator_distribution_weekly_acc.createMany({
      data,
    });

    storeDataEndTimerMetric();
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.ClientAllocatorDistributionWeeklyAcc];
  }

  getDependingTables(): AggregationTable[] {
    return [];
  }
}
