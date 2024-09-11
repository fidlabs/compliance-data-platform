import { PrismaService } from 'src/db/prisma.service';
import { PrismaDmobService } from 'src/db/prismaDmob.service';
import { AggregationRunner } from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';
import { getProvidersWeekly } from '../../../prisma/generated/client/sql';

export class ProvidersRunner implements AggregationRunner {
  async run(
    prismaService: PrismaService,
    _prismaDmobService: PrismaDmobService,
  ): Promise<void> {
    const result = await prismaService.$queryRawTyped(getProvidersWeekly());

    const data = result.map((row) => ({
      week: row.week,
      provider: row.provider,
      num_of_clients: row.num_of_clients,
      biggest_client_total_deal_size: row.biggest_client_total_deal_size,
      total_deal_size: row.total_deal_size,
      avg_retrievability_success_rate: row.avg_retrievability_success_rate,
    }));

    await prismaService.$executeRaw`truncate providers_weekly;`;
    await prismaService.providers_weekly.createMany({ data });
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.ProvidersWeekly];
  }

  getDependingTables(): AggregationTable[] {
    return [
      AggregationTable.ClientProviderDistributionWeekly,
      AggregationTable.ProviderRetrievabilityDaily,
    ];
  }

  getName(): string {
    return 'Providers Runner';
  }
}
