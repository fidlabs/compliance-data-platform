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

  // runs every hour, but only creates a snapshot for deals that don't have one for today
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

    const latestSnapshotPerDeal = groupBy(
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
      ),
      (item) => item.deal_id.toString(),
    );

    // filter out deals that already have a snapshot for today
    const porepMarketDeals = (await porepService.getActiveDeals()).filter(
      (deal) => {
        const latestSnapshot =
          latestSnapshotPerDeal[deal.dealId.toString()]?.[0]?.snapshot_date;

        if (!latestSnapshot) {
          return true;
        }

        const latestSnapshotDate = DateTime.fromJSDate(latestSnapshot, {
          zone: 'UTC',
        });

        return !isTodayUTC(latestSnapshotDate);
      },
    );

    if (porepMarketDeals.length) {
      await storageProviderUrlFinderService.ensureUrlFinderDealSLITypesExist();
    }

    const sliTypeToId = groupBy(
      await prismaService.storage_provider_url_finder_deal_sli.findMany({
        select: {
          id: true,
          sli_type: true,
        },
      }),
      (item) => item.sli_type,
    );

    const last30days = DateTime.now().toUTC().minus({ days: 30 }).toJSDate();

    const [_ipniSuccessReportingPerDeal, _ipniAllReportingPerDeal] =
      await Promise.all([
        prismaService.storage_provider_url_finder_deal_daily_snapshot.groupBy({
          by: ['deal_id'],
          where: {
            deal_id: {
              in: porepMarketDeals.map((deal) => deal.dealId),
            },
            snapshot_date: {
              gte: last30days,
            },
            result_code: StorageProviderUrlFinderMetricResultCodeType.SUCCESS,
          },
          _count: {
            result_code: true,
          },
        }),
        prismaService.storage_provider_url_finder_deal_daily_snapshot.groupBy({
          by: ['deal_id'],
          where: {
            deal_id: {
              in: porepMarketDeals.map((deal) => deal.dealId),
            },
            snapshot_date: {
              gte: last30days,
            },
          },
          _count: {
            result_code: true,
          },
        }),
      ]);

    // prettier-ignore
    const ipniSuccessReportingPerDeal = groupBy(
      _ipniSuccessReportingPerDeal,
      (item) => item.deal_id.toString(),
    );

    // prettier-ignore
    const ipniAllReportingPerDeal = groupBy(
      _ipniAllReportingPerDeal,
      (item) => item.deal_id.toString(),
    );

    class DbDataType {
      deal_id: bigint;
      snapshot_date: Date;
      tested_at: Date | null;
      result_code: StorageProviderUrlFinderMetricResultCodeType;
      sli_values: {
        value: number | null;
        sli_id: string;
      }[];
    }

    const snapshotDate = DateTime.now().toUTC().startOf('day').toJSDate();
    const sliceSize = 20;

    for (let i = 0; i < porepMarketDeals.length; i += sliceSize) {
      const _porepMarketDeals = porepMarketDeals.slice(i, i + sliceSize);

      const data: DbDataType[] = await Promise.all(
        _porepMarketDeals.map(async (deal) => {
          const dealSLIs =
            await storageProviderUrlFinderService.fetchDealLatestSLIs(
              bigIntToNumber(deal.dealId),
            );

          const ipniSuccessCount =
            ipniSuccessReportingPerDeal[deal.dealId.toString()]?.[0]?._count
              ?.result_code ?? 0;

          const ipniAllCount =
            ipniAllReportingPerDeal[deal.dealId.toString()]?.[0]?._count
              ?.result_code ?? 0;

          const ipniIndexingPct =
            ipniAllCount > 0 ? (ipniSuccessCount / ipniAllCount) * 100 : null;

          return {
            deal_id: deal.dealId,
            snapshot_date: snapshotDate,
            tested_at: dealSLIs?.tested_at
              ? new Date(dealSLIs.tested_at)
              : null,
            result_code: dealSLIs
              ? storageProviderUrlFinderService.parseUrlFinderResultCode(
                  dealSLIs.result_code,
                )
              : StorageProviderUrlFinderMetricResultCodeType.ERROR,
            sli_values: [
              {
                // not using url finder dealSLIs.porep_slis.indexing_pct here
                // CDP acts as a source of truth for this value
                value: ipniIndexingPct ?? null,
                sli_id:
                  sliTypeToId[
                    StorageProviderUrlFinderDealSLIType.INDEXING_PCT
                  ][0].id,
              },
              {
                value: dealSLIs?.porep_slis?.bandwidth_mbps ?? null,
                sli_id:
                  sliTypeToId[
                    StorageProviderUrlFinderDealSLIType.BANDWIDTH_MBPS
                  ][0].id,
              },
              {
                value: dealSLIs?.porep_slis?.latency_ms ?? null,
                sli_id:
                  sliTypeToId[StorageProviderUrlFinderDealSLIType.LATENCY_MS][0]
                    .id,
              },
              {
                value: dealSLIs?.porep_slis?.retrievability_bps ?? null,
                sli_id:
                  sliTypeToId[
                    StorageProviderUrlFinderDealSLIType.RETRIEVABILITY_BPS
                  ][0].id,
              },
            ],
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
    return [AggregationTable.StorageProviderUrlFinderDealDailySnapshot];
  }

  getDependingTables(): AggregationTable[] {
    // TODO
    return [];
  }
}
