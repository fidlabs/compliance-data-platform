import { PrismaService } from 'src/db/prisma.service';
import { PrismaDmobService } from 'src/db/prismaDmob.service';
import { FilSparkService } from 'src/filspark/filspark.service';
import { AggregationRunner } from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';
import { PostgresService } from '../../db/postgres.service';
import { QueryIterablePool } from 'pg-iterator';

export class ClientClaimsRunner implements AggregationRunner {
  async run(
    prismaService: PrismaService,
    _prismaDmobService: PrismaDmobService,
    _filSparkService: FilSparkService,
    postgresService: PostgresService,
  ): Promise<void> {
    await prismaService.$transaction(
      async (tx) => {
        const queryIterablePool = new QueryIterablePool<{
          client: string;
          hour: Date;
          total_deal_size: bigint | null;
        }>(postgresService.pool);

        const i = queryIterablePool.query(`select client,
                                                hour,
                                                sum(total_deal_size)::bigint as total_deal_size
                                         from unified_verified_deal_hourly
                                         group by client,
                                                  hour;`);

        const data: {
          client: string;
          hour: Date;
          total_deal_size: bigint | null;
        }[] = [];

        let isFirstInsert = true;
        for await (const rowResult of i) {
          data.push({
            hour: rowResult.hour,
            client: rowResult.client,
            total_deal_size: rowResult.total_deal_size,
          });

          if (data.length === 5000) {
            if (isFirstInsert) {
              await tx.$executeRaw`truncate client_claims_hourly`;
              isFirstInsert = false;
            }

            await prismaService.client_claims_hourly.createMany({
              data,
            });

            data.length = 0;
          }
        }

        if (data.length > 0) {
          if (isFirstInsert) {
            await tx.$executeRaw`truncate client_claims_hourly`;
          }
          await prismaService.client_claims_hourly.createMany({
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
    return [AggregationTable.ClientClaimsHourly];
  }

  getDependingTables(): AggregationTable[] {
    return [AggregationTable.UnifiedVerifiedDealHourly];
  }

  getName(): string {
    return 'Client Claims Runner';
  }
}
