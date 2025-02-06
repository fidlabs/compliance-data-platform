import { PrismaService } from 'src/db/prisma.service';
import { PrismaDmobService } from 'src/db/prismaDmob.service';
import { FilSparkService } from 'src/service/filspark/filspark.service';
import { AggregationRunner } from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';
import { QueryIterablePool } from 'pg-iterator';
import { PostgresService } from 'src/db/postgres.service';
import { PostgresDmobService } from 'src/db/postgresDmob.service';

export class UnifiedVerifiedDealRunner implements AggregationRunner {
  public async run(
    prismaService: PrismaService,
    _prismaDmobService: PrismaDmobService,
    _filSparkService: FilSparkService,
    _postgresService: PostgresService,
    postgresDmobService: PostgresDmobService,
  ): Promise<void> {
    await prismaService.$transaction(
      async (tx) => {
        const queryIterablePool = new QueryIterablePool<{
          hour: Date | null;
          client: string | null;
          provider: string | null;
          num_of_claims: number | null;
          total_deal_size: bigint | null;
        }>(postgresDmobService.pool);
        const i =
          queryIterablePool.query(`select date_trunc('hour', to_timestamp("termStart" * 30 + 1598306400)) as hour,
                                        'f0' || "clientId"                                              as client,
                                        'f0' || "providerId"                                            as provider,
                                        count(*)::int                                                   as num_of_claims,
                                        sum("pieceSize")::bigint                                        as total_deal_size
                                 from unified_verified_deal
                                 where "termStart" >= 3847920                                           -- nv22 start
                                   and to_timestamp("termStart" * 30 + 1598306400) <= current_timestamp -- deals that didn't start yet
                                 group by hour,
                                          client,
                                          provider;`);

        const data: {
          hour: Date | null;
          client: string | null;
          provider: string | null;
          num_of_claims: number | null;
          total_deal_size: bigint | null;
        }[] = [];

        let isFirstInsert = true;
        for await (const rowResult of i) {
          data.push({
            hour: rowResult.hour,
            client: rowResult.client,
            provider: rowResult.provider,
            num_of_claims: rowResult.num_of_claims,
            total_deal_size: rowResult.total_deal_size,
          });

          if (data.length === 5000) {
            if (isFirstInsert) {
              await tx.$executeRaw`truncate unified_verified_deal_hourly`;
              isFirstInsert = false;
            }

            await tx.unified_verified_deal_hourly.createMany({
              data,
            });

            data.length = 0;
          }
        }

        if (data.length > 0) {
          if (isFirstInsert) {
            await tx.$executeRaw`truncate unified_verified_deal_hourly`;
          }
          await tx.unified_verified_deal_hourly.createMany({
            data,
          });
        }
      },
      {
        timeout: Number.MAX_SAFE_INTEGER,
      },
    );
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.UnifiedVerifiedDealHourly];
  }

  getDependingTables(): AggregationTable[] {
    return [];
  }

  getName(): string {
    return 'Unified Verified Deal Runner';
  }
}
