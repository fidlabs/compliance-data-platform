import { QueryIterablePool } from 'pg-iterator';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';
import { getUnfiedVerfiedDealsHourly } from 'prismaDmob/generated/client/sql';

export class UnifiedVerifiedDealHourlyRunner implements AggregationRunner {
  public async run({
    prismaService,
    postgresDmobService,
    prometheusMetricService,
  }: AggregationRunnerRunServices): Promise<void> {
    const {
      startGetDataTimerByRunnerNameMetric,
      startStoreDataTimerByRunnerNameMetric,
    } = prometheusMetricService.aggregateMetrics;

    await prismaService.$transaction(
      async (tx) => {
        const getDataEndTimerMetric = startGetDataTimerByRunnerNameMetric(
          UnifiedVerifiedDealHourlyRunner.name,
        );

        const queryIterablePool = new QueryIterablePool<{
          hour: Date | null;
          client: string | null;
          provider: string | null;
          num_of_claims: number | null;
          num_of_ddo_claims: number | null;
          total_deal_size: bigint | null;
          total_ddo_deal_size: bigint | null;
        }>(postgresDmobService.pool);

        const i = queryIterablePool.query(getUnfiedVerfiedDealsHourly().sql);

        const data: {
          hour: Date | null;
          client: string | null;
          provider: string | null;
          num_of_claims: number | null;
          num_of_ddo_claims: number | null;
          total_deal_size: bigint | null;
          total_ddo_deal_size: bigint | null;
        }[] = [];

        let isFirstInsert = true;
        let storeDataEndTimerMetric;

        for await (const rowResult of i) {
          data.push({
            hour: rowResult.hour,
            client: rowResult.client,
            provider: rowResult.provider,
            num_of_claims: rowResult.num_of_claims,
            num_of_ddo_claims: rowResult.num_of_ddo_claims,
            total_deal_size: rowResult.total_deal_size,
            total_ddo_deal_size: rowResult.total_ddo_deal_size,
          });

          if (data.length === 5000) {
            if (isFirstInsert) {
              getDataEndTimerMetric();
              storeDataEndTimerMetric = startStoreDataTimerByRunnerNameMetric(
                UnifiedVerifiedDealHourlyRunner.name,
              );

              await tx.$executeRaw`delete from unified_verified_deal_hourly`;
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
            getDataEndTimerMetric();
            storeDataEndTimerMetric = startStoreDataTimerByRunnerNameMetric(
              UnifiedVerifiedDealHourlyRunner.name,
            );

            await tx.$executeRaw`delete from unified_verified_deal_hourly`;
          }
          await tx.unified_verified_deal_hourly.createMany({
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
    return [AggregationTable.UnifiedVerifiedDealHourly];
  }

  getDependingTables(): AggregationTable[] {
    return [];
  }
}
