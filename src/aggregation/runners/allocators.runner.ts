import { PrismaService } from 'src/db/prisma.service';
import { PrismaDmobService } from 'src/db/prismaDmob.service';
import { FilSparkService } from 'src/service/filspark/filspark.service';
import { AggregationRunner } from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';
import { getAllocatorsWeekly } from '../../../prisma/generated/client/sql';

export class AllocatorsRunner implements AggregationRunner {
  async run(
    prismaService: PrismaService,
    _prismaDmobService: PrismaDmobService,
    _filSparkService: FilSparkService,
  ): Promise<void> {
    const result = await prismaService.$queryRawTyped(getAllocatorsWeekly());

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

    await prismaService.$executeRaw`truncate allocators_weekly;`;
    await prismaService.allocators_weekly.createMany({ data });
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

  getName(): string {
    return 'Allocators Runner';
  }
}
