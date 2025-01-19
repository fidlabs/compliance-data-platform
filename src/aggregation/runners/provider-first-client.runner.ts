import { PrismaService } from 'src/db/prisma.service';
import { PrismaDmobService } from 'src/db/prismaDmob.service';
import { FilSparkService } from 'src/service/filspark/filspark.service';
import { AggregationRunner } from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';
import { getProviderFirstClient } from '../../../prisma/generated/client/sql';

export class ProviderFirstClientRunner implements AggregationRunner {
  async run(
    prismaService: PrismaService,
    _prismaDmobService: PrismaDmobService,
    _filSparkService: FilSparkService,
  ): Promise<void> {
    const result = await prismaService.$queryRawTyped(getProviderFirstClient());

    const data = result.map((row) => ({
      provider: row.provider,
      first_client: row.first_client,
    }));

    await prismaService.$executeRaw`truncate provider_first_client;`;
    await prismaService.provider_first_client.createMany({ data });
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.ProviderFirstClient];
  }

  getDependingTables(): AggregationTable[] {
    return [AggregationTable.UnifiedVerifiedDealHourly];
  }

  getName(): string {
    return 'Provider First Client Runner';
  }
}
