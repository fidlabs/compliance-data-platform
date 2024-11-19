import { PrismaService } from 'src/db/prisma.service';
import { PrismaDmobService } from 'src/db/prismaDmob.service';
import { FilSparkService } from 'src/filspark/filspark.service';
import { AggregationRunner } from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';
import { getClientProviderDistributionWeekly } from '../../../prismaDmob/generated/client/sql';

export class ClientProviderDistributionWeeklyRunner
  implements AggregationRunner
{
  async run(
    prismaService: PrismaService,
    prismaDmobService: PrismaDmobService,
    _filSparkService: FilSparkService,
  ): Promise<void> {
    const result = await prismaDmobService.$queryRawTyped(
      getClientProviderDistributionWeekly(),
    );

    const data = result.map((dmobResult) => ({
      week: dmobResult.week,
      client: dmobResult.client,
      provider: dmobResult.provider,
      total_deal_size: dmobResult.total_deal_size,
      unique_data_size: dmobResult.unique_data_size,
    }));

    await prismaService.$executeRaw`truncate client_provider_distribution_weekly;`;
    await prismaService.client_provider_distribution_weekly.createMany({
      data,
    });
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.ClientProviderDistributionWeekly];
  }

  getDependingTables(): AggregationTable[] {
    return [];
  }

  getName(): string {
    return 'Client/Provider Distribution Weekly Runner';
  }
}
