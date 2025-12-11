import { Logger } from '@nestjs/common';
import { Prisma } from 'prisma/generated/client';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';
import { AllocatorAuditOutcome } from 'src/service/allocator/types.allocator';

export class AllocatorClientBookkeepingRunner implements AggregationRunner {
  private readonly logger = new Logger(AllocatorClientBookkeepingRunner.name);

  public async run({
    prismaService,
    prometheusMetricService,
    allocatorClientBookkeepingService,
    allocatorService,
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
        allocator_id: true,
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
      .filter(
        (row) =>
          row.registry_info['application']['allocation_bookkeeping'].startsWith(
            'https://github.com/',
          ) &&
          !row.registry_info['audits']?.some(
            (audit) =>
              allocatorService.mapAuditOutcome(
                audit.outcome,
                row.allocator_id,
              ) === AllocatorAuditOutcome.failed,
          ),
      )
      .map((row) => {
        const url = row.registry_info['application']['allocation_bookkeeping'];
        const [owner, repo] = url.split('/').slice(3);
        return { allocatorId: row.allocator_id, owner: owner, repo: repo };
      });

    const result = [];

    for (const bookkeeping of bookkeeping_repos) {
      const bookkeepingData =
        await allocatorClientBookkeepingService.fetchAllocatorsClientBookkeeping(
          bookkeeping.owner,
          bookkeeping.repo,
        );

      const dataWithAllocatorId = bookkeepingData.map((row) => ({
        allocator_id: bookkeeping.allocatorId,
        client_id: row.clientId,
        client_address: row.clientAddress,
        json_path: row.jsonPath,
        bookkeeping_info: row.bookkeepingInfo,
      }));

      result.push(...dataWithAllocatorId);
    }

    getDataEndTimerMetric();

    const storeDataEndTimerMetric = startStoreDataTimerByRunnerNameMetric(
      AllocatorClientBookkeepingRunner.name,
    );

    await prismaService.$transaction(
      result.map((row) =>
        prismaService.allocator_client_bookkeeping.upsert({
          where: {
            allocator_id_client_id: {
              allocator_id: row.allocator_id,
              client_id: row.client_id,
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
