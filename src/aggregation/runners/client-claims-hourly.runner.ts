import { QueryIterablePool } from 'pg-iterator';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';

export class ClientClaimsHourlyRunner implements AggregationRunner {
  public async run({
    prismaService,
    postgresService,
    prometheusMetricService,
  }: AggregationRunnerRunServices): Promise<void> {
    const runnerName = this.getName();
    const {
      startGetDataTimerByRunnerNameMetric,
      startStoreDataTimerByRunnerNameMetric,
    } = prometheusMetricService.aggregateMetrics;

    await prismaService.$transaction(
      async (tx) => {
        const getDataEndTimerMetric =
          startGetDataTimerByRunnerNameMetric(runnerName);

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

        let storeDataEndTimerMetric;

        let isFirstInsert = true;
        for await (const rowResult of i) {
          data.push({
            hour: rowResult.hour,
            client: rowResult.client,
            total_deal_size: rowResult.total_deal_size,
          });

          if (data.length === 5000) {
            if (isFirstInsert) {
              isFirstInsert = false;
              getDataEndTimerMetric();
              storeDataEndTimerMetric =
                startStoreDataTimerByRunnerNameMetric(runnerName);
              await tx.$executeRaw`delete from client_claims_hourly`;
            }

            await tx.client_claims_hourly.createMany({
              data,
            });

            data.length = 0;
          }
        }

        if (data.length > 0) {
          if (isFirstInsert) {
            getDataEndTimerMetric();
            storeDataEndTimerMetric =
              startStoreDataTimerByRunnerNameMetric(runnerName);
            await tx.$executeRaw`delete from client_claims_hourly`;
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
    return 'Client Claims Hourly Runner';
  }
}
