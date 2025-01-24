import { PrismaService } from 'src/db/prisma.service';
import { PrismaDmobService } from 'src/db/prismaDmob.service';
import { FilSparkService } from 'src/service/filspark/filspark.service';
import { AggregationRunner } from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';
import { getClientProviderDistribution } from '../../../prismaDmob/generated/client/sql';

export class ClientProviderDistributionRunner implements AggregationRunner {
  async run(
    prismaService: PrismaService,
    prismaDmobService: PrismaDmobService,
    _filSparkService: FilSparkService,
  ): Promise<void> {
    const result = await prismaDmobService.$queryRawTyped(
      getClientProviderDistribution(),
    );

    const data = result.map((dmobResult) => ({
      client: dmobResult.client,
      provider: dmobResult.provider,
      total_deal_size: dmobResult.total_deal_size,
      unique_data_size: dmobResult.unique_data_size,
      claims_count: dmobResult.claims_count,
    }));

    await prismaService.$executeRaw`truncate client_provider_distribution;`;
    await prismaService.client_provider_distribution.createMany({
      data,
    });
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.ClientProviderDistribution];
  }

  getDependingTables(): AggregationTable[] {
    return [];
  }

  getName(): string {
    return 'Client/Provider Distribution Runner';
  }
}
