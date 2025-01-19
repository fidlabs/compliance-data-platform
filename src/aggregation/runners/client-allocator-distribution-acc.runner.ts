import { PrismaService } from 'src/db/prisma.service';
import { PrismaDmobService } from 'src/db/prismaDmob.service';
import { FilSparkService } from 'src/service/filspark/filspark.service';
import { AggregationRunner } from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';
import { getClientAllocatorDistributionWeeklyAcc } from '../../../prismaDmob/generated/client/sql';

export class ClientAllocatorDistributionAccRunner implements AggregationRunner {
  async run(
    prismaService: PrismaService,
    prismaDmobService: PrismaDmobService,
    _filSparkService: FilSparkService,
  ): Promise<void> {
    const result = await prismaDmobService.$queryRawTyped(
      getClientAllocatorDistributionWeeklyAcc(),
    );

    const data = result.map((dmobResult) => ({
      week: dmobResult.week,
      client: dmobResult.client,
      allocator: dmobResult.allocator,
      num_of_allocations: dmobResult.num_of_allocations,
      sum_of_allocations: dmobResult.sum_of_allocations,
    }));

    await prismaService.$executeRaw`truncate client_allocator_distribution_weekly_acc;`;
    await prismaService.client_allocator_distribution_weekly_acc.createMany({
      data,
    });
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.ClientAllocatorDistributionWeeklyAcc];
  }

  getDependingTables(): AggregationTable[] {
    return [];
  }

  getName(): string {
    return 'Client/Allocator Distribution Acc Runner';
  }
}
