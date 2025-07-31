import { Logger } from '@nestjs/common';
import { AllocatorRegistry } from 'src/service/github-allocator-registry/types.github-allocator-registry';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';

export class AllocatorRegistryArchiveRunner implements AggregationRunner {
  private readonly logger = new Logger(AllocatorRegistryArchiveRunner.name);

  public async run({
    prismaService,
    prometheusMetricService,
    allocatorRegistryService,
  }: AggregationRunnerRunServices): Promise<void> {
    if (!allocatorRegistryService.isInitialized()) {
      this.logger.warn(
        'Allocator registry service is not initialized for archive allocators; check your environment variables; skipping this run',
      );

      return;
    }

    const {
      startGetDataTimerByRunnerNameMetric,
      startStoreDataTimerByRunnerNameMetric,
    } = prometheusMetricService.aggregateMetrics;

    const getDataEndTimerMetric = startGetDataTimerByRunnerNameMetric(
      AllocatorRegistryArchiveRunner.name,
    );

    let archiveResult =
      await allocatorRegistryService.getAllocatorsRegistry('Allocator_Archive');

    getDataEndTimerMetric();

    const storeDataEndTimerMetric = startStoreDataTimerByRunnerNameMetric(
      AllocatorRegistryArchiveRunner.name,
    );

    const uniqueResults = new Map<string, AllocatorRegistry>();

    for (const allocator of archiveResult) {
      if (uniqueResults.has(allocator.allocator_id)) {
        this.logger.error(
          `Duplicate allocator found in archive-registry: ${allocator.allocator_id} in ${allocator.json_path} and ${uniqueResults.get(allocator.allocator_id).json_path}, please investigate`,
        );
      }

      uniqueResults.set(allocator.allocator_id, allocator);
    }

    archiveResult = Array.from(uniqueResults.values());

    await prismaService.$executeRaw`delete from allocator_registry_archive;`;
    await prismaService.allocator_registry_archive.createMany({
      data: archiveResult,
    });

    storeDataEndTimerMetric();
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.AllocatorRegistryArchive];
  }

  getDependingTables(): AggregationTable[] {
    return [];
  }
}
