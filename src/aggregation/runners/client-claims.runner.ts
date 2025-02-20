import { QueryIterablePool } from 'pg-iterator';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';

export class ClientClaimsRunner implements AggregationRunner {
  public async run({
    prismaService,
    postgresService,
    prometheusMetricService,
  }: AggregationRunnerRunServices): Promise<void> {
    const runnerName = this.getName();

    await prismaService.$transaction(
      async (tx) => {
        const getDataEndTimerMetric =
          prometheusMetricService.allocatorReportGeneratorMetrics.startGetDataTimerByRunnerNameMetric(
            runnerName,
          );

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

        getDataEndTimerMetric();

        const data: {
          client: string;
          hour: Date;
          total_deal_size: bigint | null;
        }[] = [];

        const storeDataEndTimerMetric =
          prometheusMetricService.allocatorReportGeneratorMetrics.startStoreDataTimerByRunnerNameMetric(
            runnerName,
          );

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

            await tx.client_claims_hourly.createMany({
              data,
            });

            data.length = 0;
          }
        }

        if (data.length > 0) {
          if (isFirstInsert) {
            await tx.$executeRaw`truncate client_claims_hourly`;
          }
          await tx.client_claims_hourly.createMany({
            data,
          });
        }
        storeDataEndTimerMetric();
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
