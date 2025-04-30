import { Prisma } from 'prisma/generated/client';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';
import { Logger } from '@nestjs/common';

export class AllocatorClientBookkeepingRunner implements AggregationRunner {
  private readonly logger = new Logger(AllocatorClientBookkeepingRunner.name);

  public async run({
    prismaService,
    prometheusMetricService,
    allocatorClientBookkeepingService,
  }: AggregationRunnerRunServices): Promise<void> {
    if (!allocatorClientBookkeepingService.isInitialized()) {
      this.logger.warn(
        'Allocator client bookkeeping service is not initialized; check your environment variables; skipping this run',
      );

      return;
    }

    const {
      startGetDataTimerByRunnerNameMetric,
      startStoreDataTimerByRunnerNameMetric,
    } = prometheusMetricService.aggregateMetrics;

    const getDataEndTimerMetric = startGetDataTimerByRunnerNameMetric(
      AllocatorClientBookkeepingRunner.name,
    );

    const allocators = await prismaService.allocator_registry.findMany({
      select: {
        id: true,
        registry_info: true,
      },
      where: {
        registry_info: {
          path: ['application', 'allocation_bookkeeping'],
          not: Prisma.JsonNull,
        },
      },
    });
    const bookkeeping_repos = allocators
      .filter((row) =>
        row.registry_info['application']['allocation_bookkeeping'].startsWith(
          'https://github.com/',
        ),
      )
      .map((row) => {
        const allocatorId = row.id;
        const url = row.registry_info['application']['allocation_bookkeeping'];
        const [owner, repo] = url.split('/').slice(3);
        return { allocatorId, owner, repo };
      });

    const data = [];
    for (const bookkeeping of bookkeeping_repos) {
      const bookkeepingData =
        await allocatorClientBookkeepingService.getAllocatorsClientBookkeeping(
          bookkeeping.owner,
          bookkeeping.repo,
        );
      const dataWithAllocatorId = bookkeepingData.map((row) => ({
        allocatorId: bookkeeping.allocatorId,
        ...row,
      }));
      data.push(...dataWithAllocatorId);
    }
    getDataEndTimerMetric();

    const storeDataEndTimerMetric = startStoreDataTimerByRunnerNameMetric(
      AllocatorClientBookkeepingRunner.name,
    );

    await prismaService.$transaction(
      data.map((row) =>
        prismaService.allocator_client_bookkeeping.upsert({
          where: {
            allocatorId_clientId: {
              allocatorId: row.allocatorId,
              clientId: row.clientId,
            },
          },
          update: row,
          create: row,
        }),
      ),
    );

    storeDataEndTimerMetric();
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.AllocatorClientBookkeeping];
  }

  getDependingTables(): AggregationTable[] {
    return [AggregationTable.AllocatorRegistry];
  }
}
