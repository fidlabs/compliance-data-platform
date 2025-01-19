import { PrismaService } from 'src/db/prisma.service';
import { PrismaDmobService } from 'src/db/prismaDmob.service';
import { FilSparkService } from 'src/service/filspark/filspark.service';
import { AggregationRunner } from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';
import { DateTime } from 'luxon';

export class ProviderRetrievabilityRunner implements AggregationRunner {
  async run(
    prismaService: PrismaService,
    _prismaDmobService: PrismaDmobService,
    filSparkService: FilSparkService,
  ): Promise<void> {
    const latestStored =
      await prismaService.provider_retrievability_daily.findFirst({
        select: {
          date: true,
        },
        orderBy: {
          date: 'desc',
        },
      });
    const latestStoredDate = latestStored
      ? DateTime.fromJSDate(latestStored.date, { zone: 'UTC' })
      : null;
    const yesterday = DateTime.now()
      .setZone('UTC')
      .minus({ days: 1 })
      .startOf('day');

    if (latestStoredDate >= yesterday) {
      // already downloaded yesterday's retrievability, wait for next day
      return;
    }

    const retrievabilityData =
      await filSparkService.fetchRetrievability(yesterday);

    const data = retrievabilityData.map((row) => ({
      date: yesterday.toJSDate(),
      provider: row.miner_id,
      total: parseInt(row.total),
      successful: parseInt(row.successful),
      success_rate: row.success_rate,
    }));

    await prismaService.provider_retrievability_daily.createMany({ data });
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.ProviderRetrievabilityDaily];
  }

  getDependingTables(): AggregationTable[] {
    return [];
  }

  getName(): string {
    return 'Provider Retrievability Runner';
  }
}
