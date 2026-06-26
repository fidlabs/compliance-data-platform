import { Logger } from '@nestjs/common';
import { DateTime } from 'luxon';
import { isTodayUTC, sleep } from 'src/utils/utils';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';
import { groupBy } from 'lodash';
import { bigIntToNumber } from 'src/utils/utils';
import {
  StorageProviderUrlFinderDealSLIType,
  StorageProviderUrlFinderMetricResultCodeType,
} from 'prisma/generated/client';

export class ProviderUrlFinderDealDailySnapshotRunner implements AggregationRunner {
  private readonly logger = new Logger(
    ProviderUrlFinderDealDailySnapshotRunner.name,
  );

  public async run({
    prismaService,
    prometheusMetricService,
    storageProviderUrlFinderService,
    porepService,
  }: AggregationRunnerRunServices): Promise<void> {
    const {
      startGetDataTimerByRunnerNameMetric,
      startStoreDataTimerByRunnerNameMetric,
    } = prometheusMetricService.aggregateMetrics;

    const getDataEndTimerMetric = startGetDataTimerByRunnerNameMetric(
      ProviderUrlFinderDealDailySnapshotRunner.name,
    );

    const storeDataEndTimerMetric = startStoreDataTimerByRunnerNameMetric(
      ProviderUrlFinderDealDailySnapshotRunner.name,
    );

    const _latestStoredPerDeal =
      await prismaService.storage_provider_url_finder_deal_daily_snapshot.findMany(
        {
          select: {
            snapshot_date: true,
            deal_id: true,
          },
          orderBy: {
            snapshot_date: 'desc',
          },
          distinct: ['deal_id'],
        },
      );

    const latestStoredPerDeal = groupBy(_latestStoredPerDeal, (item) =>
      item.deal_id.toString(),
    );

    // filter out deals that already have a snapshot for today
    const porepMarketDeals = (await porepService.getActiveDeals()).filter(
      (deal) => {
        const latestStored = latestStoredPerDeal[deal.dealId.toString()];
        if (!latestStored || latestStored.length === 0) {
          return true;
        }

        const latestStoredDate = DateTime.fromJSDate(
          latestStored[0].snapshot_date,
          { zone: 'UTC' },
        );

        return !isTodayUTC(latestStoredDate);
      },
    );

    if (porepMarketDeals.length) {
      await storageProviderUrlFinderService.ensureUrlFinderDealSLITypesExist();
    }

    class DataType {
      deal_id: bigint;
      snapshot_date: Date;
      tested_at: Date;
      result_code: StorageProviderUrlFinderMetricResultCodeType;
      sli_values: {
        value: number | null;
        tested_at: Date;
        deal_id: bigint;
        sli_id: string;
      }[];
    }

    const snapshotDate = DateTime.now().toUTC().startOf('day').toJSDate();
    const sliceSize = 20;

    const sliTypeToId = groupBy(
      await prismaService.storage_provider_url_finder_deal_sli.findMany({
        select: {
          id: true,
          sli_type: true,
        },
      }),
      (item) => item.sli_type,
    );

    for (let i = 0; i < porepMarketDeals.length; i += sliceSize) {
      const _porepMarketDeals = porepMarketDeals.slice(i, i + sliceSize);

      const data: DataType[] = await Promise.all(
        _porepMarketDeals.map(async (deal) => {
          const dealSlis =
            await storageProviderUrlFinderService.fetchDealLatestSLIs(
              bigIntToNumber(deal.dealId),
            );

          const testedAt = dealSlis ? new Date(dealSlis.tested_at) : null;

          return {
            deal_id: deal.dealId,
            snapshot_date: snapshotDate,
            tested_at: testedAt,
            result_code: dealSlis
              ? storageProviderUrlFinderService.parseUrlFinderResultCode(
                  dealSlis.result_code,
                )
              : StorageProviderUrlFinderMetricResultCodeType.ERROR,
            sli_values: dealSlis
              ? [
                  {
                    value: dealSlis.porep_slis.indexing_pct,
                    tested_at: testedAt,
                    deal_id: deal.dealId,
                    sli_id:
                      sliTypeToId[
                        StorageProviderUrlFinderDealSLIType.INDEXING_PCT
                      ][0].id,
                  },
                  {
                    value: dealSlis.porep_slis.bandwidth_mbps,
                    tested_at: testedAt,
                    deal_id: deal.dealId,
                    sli_id:
                      sliTypeToId[
                        StorageProviderUrlFinderDealSLIType.BANDWIDTH_MBPS
                      ][0].id,
                  },
                  {
                    value: dealSlis.porep_slis.latency_ms,
                    tested_at: testedAt,
                    deal_id: deal.dealId,
                    sli_id:
                      sliTypeToId[
                        StorageProviderUrlFinderDealSLIType.LATENCY_MS
                      ][0].id,
                  },
                  {
                    value: dealSlis.porep_slis.retrievability_bps,
                    tested_at: testedAt,
                    deal_id: deal.dealId,
                    sli_id:
                      sliTypeToId[
                        StorageProviderUrlFinderDealSLIType.RETRIEVABILITY_BPS
                      ][0].id,
                  },
                ]
              : [],
          };
        }),
      );

      await prismaService.$transaction(
        data.map((item) =>
          prismaService.storage_provider_url_finder_deal_daily_snapshot.create({
            data: {
              ...item,
              sli_values: {
                createMany: {
                  data: item.sli_values,
                  skipDuplicates: true,
                },
              },
            },
          }),
        ),
      );

      // log progress every ~100 deals
      if (i % 100 < sliceSize && i > 0) {
        this.logger.debug(
          `Processed ${i} of ${porepMarketDeals.length} PoRep Market deals`,
        );
      }

      await sleep(5000); // 5 seconds
    }

    this.logger.debug(
      `Processed all ${porepMarketDeals.length} PoRep Market deals`,
    );

    getDataEndTimerMetric();
    storeDataEndTimerMetric();
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.StorageProviderUrlFinderDailySnapshot];
  }

  getDependingTables(): AggregationTable[] {
    // TODO
    return [];
  }
}
