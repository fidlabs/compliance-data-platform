import { AllocatorRegistry } from 'src/service/github-allocator-registry/types.github-allocator-registry';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';
import { Logger } from '@nestjs/common';

export class AllocatorRegistryRunner implements AggregationRunner {
  private readonly logger = new Logger(AllocatorRegistryRunner.name);

  public async run({
    prismaService,
    prometheusMetricService,
    allocatorRegistryService,
  }: AggregationRunnerRunServices): Promise<void> {
    if (!allocatorRegistryService.isInitialized()) {
      this.logger.warn(
        'Allocator registry service is not initialized; check your environment variables; skipping this run',
      );

      return;
    }

    const {
      startGetDataTimerByRunnerNameMetric,
      startStoreDataTimerByRunnerNameMetric,
    } = prometheusMetricService.aggregateMetrics;

    const getDataEndTimerMetric = startGetDataTimerByRunnerNameMetric(
      AllocatorRegistryRunner.name,
    );

    let result = await allocatorRegistryService.getAllocatorsRegistry();

    getDataEndTimerMetric();

    const storeDataEndTimerMetric = startStoreDataTimerByRunnerNameMetric(
      AllocatorRegistryRunner.name,
    );

    // find duplicates and remove them - prioritizing new scheme JSONs
    const uniqueResults = new Map<string, AllocatorRegistry>();

    const shouldInsert = (allocator: AllocatorRegistry): boolean => {
      if (!uniqueResults.has(allocator.allocator_id)) {
        return true;
      }

      const isOldSchemePath = (path: string) => path.match(/.*\/?\d+\.json$/i);

      const existingPath = uniqueResults.get(allocator.allocator_id).json_path;
      const newPath = allocator.json_path;
      return isOldSchemePath(existingPath) && !isOldSchemePath(newPath);
    };

    for (const allocator of result) {
      if (uniqueResults.has(allocator.allocator_id)) {
        this.logger.error(
          `Duplicate allocator found: ${allocator.allocator_id} in ${allocator.json_path} and ${uniqueResults.get(allocator.allocator_id).json_path}, please investigate`,
        );
      }
      if (shouldInsert(allocator)) {
        uniqueResults.set(allocator.allocator_id, allocator);
      }
    }

    result = Array.from(uniqueResults.values());

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
