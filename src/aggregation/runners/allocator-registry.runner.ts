import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';

export class AllocatorRegistryRunner implements AggregationRunner {
  public async run({
    prismaService,
    prometheusMetricService,
    allocatorRegistryService,
  }: AggregationRunnerRunServices): Promise<void> {
    const {
      startGetDataTimerByRunnerNameMetric,
      startStoreDataTimerByRunnerNameMetric,
    } = prometheusMetricService.aggregateMetrics;

    const getDataEndTimerMetric = startGetDataTimerByRunnerNameMetric(
      AllocatorRegistryRunner.name,
    );

    const result = await allocatorRegistryService.getAllocatorsRegistry();

    getDataEndTimerMetric();

    const storeDataEndTimerMetric = startStoreDataTimerByRunnerNameMetric(
      AllocatorRegistryRunner.name,
    );

    await prismaService.$executeRaw`delete from allocator_registry;`;
    await prismaService.allocator_registry.createMany({ data: result });

    storeDataEndTimerMetric();
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.AllocatorRegistry];
  }

  getDependingTables(): AggregationTable[] {
    return [];
  }
}
