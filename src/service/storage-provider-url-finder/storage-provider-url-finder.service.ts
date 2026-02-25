import { HttpService } from '@nestjs/axios';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { groupBy } from 'lodash';
import {
  StorageProviderSliMetricType,
  StorageProviderUrlFinderMetricResultCodeType,
  StorageProviderUrlFinderMetricType,
} from 'prisma/generated/client';
import { lastValueFrom } from 'rxjs';
import { PrismaService } from 'src/db/prisma.service';
import {
  SliStorageProviderMetricData,
  StorageProviderMetricHistogramDailyResponse,
  StorageProviderMetricHistogramDay,
  StorageProviderMetricHistogramResult,
  StorageProviderUrlFinderDailySnapshot,
  UrlFinderStorageProviderBulkResponse,
  UrlFinderStorageProviderDataResponse,
} from './types.storage-provider-url-finder.service';
import { stringToNumber } from 'src/utils/utils';
import { DateTime } from 'luxon';

@Injectable()
export class StorageProviderUrlFinderService {
  private readonly logger = new Logger(StorageProviderUrlFinderService.name);
  private readonly URL_FINDER_API_URL: string;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly httpService: HttpService,
    private configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    this.URL_FINDER_API_URL =
      this.configService.get<string>('URL_FINDER_API_URL');
  }

  // fetch the last retrievability as a value between 0 and 1 or null (the UrlFinder returns percentage value)
  public async fetchLastStorageProviderRetrievability(
    storageProviderId: string,
    clientId?: string,
  ): Promise<number | null> {
    const spData = await this.fetchLastStorageProviderData(
      storageProviderId,
      clientId,
    );

    return spData?.retrievability_percent != null
      ? spData.retrievability_percent / 100
      : null;
  }

  // fetches the last data for storage provider from URL Finder including diagnostics and metrics if exists
  public async fetchLastStorageProviderData(
    storageProviderId: string,
    clientId?: string,
  ): Promise<UrlFinderStorageProviderDataResponse | null> {
    try {
      return await this._fetchLastStorageProviderData(
        storageProviderId,
        clientId,
      );
    } catch (err) {
      this.logger.warn(
        `Error fetching URL finder data for provider: ${storageProviderId} ${clientId ? `client: ${clientId}` : ''}: ${err.message}`,
      );

      return null;
    }
  }

  private async _fetchLastStorageProviderData(
    storageProviderId: string,
    clientId?: string,
  ): Promise<UrlFinderStorageProviderDataResponse> {
    const endpoint = `${this.URL_FINDER_API_URL}/providers/${storageProviderId}${clientId ? `/clients/${clientId}` : ''}?extended=true`;

    const { data } = await lastValueFrom(
      this.httpService.get<UrlFinderStorageProviderDataResponse>(endpoint),
    );

    return data;
  }

  public async fetchLastStorageProviderDataInBulk(
    storageProviderIds: string[],
  ): Promise<UrlFinderStorageProviderBulkResponse | null> {
    const endpoint = `${this.URL_FINDER_API_URL}/providers/bulk?extended=true`;

    const { data } = await lastValueFrom(
      this.httpService.post<UrlFinderStorageProviderBulkResponse | null>(
        endpoint,
        {
          provider_ids: storageProviderIds,
        },
      ),
    );

    return data;
  }

  public async fetchHistoricalStorageProviderData(
    storageProviderId: string,
    clientId?: string,
    options?: { from: string; to: string },
  ): Promise<SliStorageProviderMetricData[]> {
    const endpoint = `${this.URL_FINDER_API_URL}/url/find/${storageProviderId}${clientId ? `/${clientId}` : ''} ${options ? `?from=${options.from}&to=${options.to}` : ''}`;

    const { data } = await lastValueFrom(
      this.httpService.get<SliStorageProviderMetricData[]>(endpoint),
    );

    return data;
  }

  public async storeSliMetricForStorageProviders(
    metricType: StorageProviderSliMetricType,
    storageProviderMetricData: SliStorageProviderMetricData[],
  ): Promise<void> {
    const createOrUpdateMetric = {
      metric_type: metricType,
      name: this.getSliMetricName(metricType),
      description: this.getSliMetricDescription(metricType),
      unit: this.getSliMetricUnit(metricType),
    };

    const metric = await this.prismaService.storage_provider_sli_metric.upsert({
      where: {
        metric_type: metricType,
      },
      create: createOrUpdateMetric,
      update: createOrUpdateMetric, // in case description or name changes
    });

    const data = storageProviderMetricData.map((metricData) => ({
      metric_id: metric.id,
      provider_id: metricData.providerId,
      value: metricData.value,
      update_date: metricData.lastUpdateAt,
    }));

    this.logger.log(
      `Storing ${data.length} providers for metric type ${metricType}`,
    );

    await this.prismaService.storage_provider_sli.createMany({ data: data });
  }

  private getSliMetricName(
    storageProviderMetric: StorageProviderSliMetricType,
  ) {
    const SLI_METRIC_NAME: Record<
      keyof typeof StorageProviderSliMetricType,
      string
    > = {
      [StorageProviderSliMetricType.TTFB]: 'TTFB',
      [StorageProviderSliMetricType.RPA_RETRIEVABILITY]: 'RPA Retrievability',
      [StorageProviderSliMetricType.RETENTION]: 'Retention',
      [StorageProviderSliMetricType.BANDWIDTH]: 'Bandwith',
    };

    return SLI_METRIC_NAME[storageProviderMetric];
  }

  private getSliMetricDescription(
    storageProviderMetric: StorageProviderSliMetricType,
  ) {
    const SLI_METRIC_DESCRIPTION: Record<
      keyof typeof StorageProviderSliMetricType,
      string
    > = {
      [StorageProviderSliMetricType.TTFB]: 'Time to first byte (TTFB)',
      [StorageProviderSliMetricType.RPA_RETRIEVABILITY]:
        'RPA Retrievability percentage',
      [StorageProviderSliMetricType.RETENTION]:
        'Consensus failures of PoRep Interrogating the PDP proofs continuity',
      [StorageProviderSliMetricType.BANDWIDTH]: 'Download bandwidth in Mbps',
    };

    return SLI_METRIC_DESCRIPTION[storageProviderMetric];
  }

  private getSliMetricUnit(
    storageProviderMetric: StorageProviderSliMetricType,
  ) {
    const SLI_METRIC_UNIT: Record<
      keyof typeof StorageProviderSliMetricType,
      string
    > = {
      [StorageProviderSliMetricType.TTFB]: 'ms',
      [StorageProviderSliMetricType.RPA_RETRIEVABILITY]: '%',
      [StorageProviderSliMetricType.RETENTION]: 'qty',
      [StorageProviderSliMetricType.BANDWIDTH]: 'Mbps',
    };

    return SLI_METRIC_UNIT[storageProviderMetric];
  }

  private getMetricName(
    storageProviderMetric: StorageProviderUrlFinderMetricType,
  ) {
    const METRIC_NAME: Record<
      keyof typeof StorageProviderUrlFinderMetricType,
      string
    > = {
      [StorageProviderUrlFinderMetricType.TTFB]: 'TTFB',
      [StorageProviderUrlFinderMetricType.RPA_RETRIEVABILITY]:
        'RPA Retrievability',
      [StorageProviderUrlFinderMetricType.BANDWIDTH]: 'Bandwith',
      [StorageProviderUrlFinderMetricType.CAR_FILES]:
        'CAR files Retrievability',
    };

    return METRIC_NAME[storageProviderMetric];
  }

  private getMetricDescription(
    storageProviderMetric: StorageProviderUrlFinderMetricType,
  ) {
    const METRIC_DESCRIPTION: Record<
      keyof typeof StorageProviderUrlFinderMetricType,
      string
    > = {
      [StorageProviderUrlFinderMetricType.TTFB]: 'Time to first byte (TTFB)',
      [StorageProviderUrlFinderMetricType.RPA_RETRIEVABILITY]:
        'RPA Retrievability percentage',
      [StorageProviderUrlFinderMetricType.BANDWIDTH]:
        'Download bandwidth in Mbps',
      [StorageProviderUrlFinderMetricType.CAR_FILES]:
        'CAR files retrievability percentage',
    };

    return METRIC_DESCRIPTION[storageProviderMetric];
  }

  private getMetricUnit(
    storageProviderMetric: StorageProviderUrlFinderMetricType,
  ) {
    const METRIC_UNIT: Record<
      keyof typeof StorageProviderUrlFinderMetricType,
      string
    > = {
      [StorageProviderUrlFinderMetricType.TTFB]: 'ms',
      [StorageProviderUrlFinderMetricType.RPA_RETRIEVABILITY]: '%',
      [StorageProviderUrlFinderMetricType.BANDWIDTH]: 'Mbps',
      [StorageProviderUrlFinderMetricType.CAR_FILES]: '%',
    };

    return METRIC_UNIT[storageProviderMetric];
  }

  public parseUrlFinderResultCode(
    urlFinderResultCode: string,
  ): StorageProviderUrlFinderMetricResultCodeType {
    const mapping: Record<
      string,
      StorageProviderUrlFinderMetricResultCodeType
    > = {
      NoPeerId: StorageProviderUrlFinderMetricResultCodeType.NO_PEER_ID,
      NoCidContactData:
        StorageProviderUrlFinderMetricResultCodeType.NO_CID_CONTACT_DATA,
      MissingAddrFromCidContact:
        StorageProviderUrlFinderMetricResultCodeType.MISSING_ADDR_FROM_CID_CONTACT,
      MissingHttpAddrFromCidContact:
        StorageProviderUrlFinderMetricResultCodeType.MISSING_HTTP_ADDR_FROM_CID_CONTACT,
      FailedToGetWorkingUrl:
        StorageProviderUrlFinderMetricResultCodeType.FAILED_TO_GET_WORKING_URL,
      NoDealsFound: StorageProviderUrlFinderMetricResultCodeType.NO_DEALS_FOUND,
      TimedOut: StorageProviderUrlFinderMetricResultCodeType.TIMED_OUT,
      Success: StorageProviderUrlFinderMetricResultCodeType.SUCCESS,
      Error: StorageProviderUrlFinderMetricResultCodeType.ERROR,
    };

    return (
      mapping[urlFinderResultCode] ||
      StorageProviderUrlFinderMetricResultCodeType.ERROR
    );
  }

  public RESULT_CODE_META: Record<
    StorageProviderUrlFinderMetricResultCodeType,
    { name: string; description: string }
  > = {
    [StorageProviderUrlFinderMetricResultCodeType.NO_PEER_ID]: {
      name: 'No Peer ID',
      description: 'No peer ID found for this provider',
    },
    [StorageProviderUrlFinderMetricResultCodeType.NO_CID_CONTACT_DATA]: {
      name: 'No CID Contact Data',
      description: 'No entry in cid contact',
    },
    [StorageProviderUrlFinderMetricResultCodeType.MISSING_ADDR_FROM_CID_CONTACT]:
      {
        name: 'Missing Address from CID Contact',
        description: 'No entry point found in cid contact',
      },
    [StorageProviderUrlFinderMetricResultCodeType.MISSING_HTTP_ADDR_FROM_CID_CONTACT]:
      {
        name: 'Missing HTTP Address from CID Contact',
        description: 'No HTTP entry point in cid contact',
      },
    [StorageProviderUrlFinderMetricResultCodeType.FAILED_TO_GET_WORKING_URL]: {
      name: 'Failed to Get Working URL',
      description: 'None of the tested URLs are working',
    },
    [StorageProviderUrlFinderMetricResultCodeType.NO_DEALS_FOUND]: {
      name: 'No Deals Found',
      description: 'No deals found for given miner',
    },
    [StorageProviderUrlFinderMetricResultCodeType.TIMED_OUT]: {
      name: 'Timed Out',
      description: 'Request timed out while discovering URL',
    },
    [StorageProviderUrlFinderMetricResultCodeType.SUCCESS]: {
      name: 'Success',
      description: 'Found working URL',
    },
    [StorageProviderUrlFinderMetricResultCodeType.ERROR]: {
      name: 'Error',
      description: 'Provider not indexed yet or error occurred',
    },
  };

  public async ensureUrlFinderMetricTypesExist() {
    const metricTypes = Object.values(StorageProviderUrlFinderMetricType);

    for (const metricType of metricTypes) {
      const createOrUpdateMetric = {
        metric_type: metricType,
        name: this.getMetricName(metricType),
        description: this.getMetricDescription(metricType),
        unit: this.getMetricUnit(metricType),
      };

      await this.prismaService.storage_provider_url_finder_metric.upsert({
        where: {
          metric_type: metricType,
        },
        create: createOrUpdateMetric,
        update: createOrUpdateMetric, // in case description or name changes
      });
    }
  }

  public async storeSnapshotMetricsForStorageProviders(
    storageProvidersSnapshotData: StorageProviderUrlFinderDailySnapshot[],
  ): Promise<void> {
    const metrics =
      await this.prismaService.storage_provider_url_finder_metric.findMany();

    const metricIdByType = new Map(metrics.map((m) => [m.metric_type, m.id]));

    await this.prismaService.$transaction(
      storageProvidersSnapshotData.map((snapshotData) =>
        this.prismaService.storage_provider_url_finder_daily_snapshot.create({
          data: {
            provider: snapshotData.provider,
            snapshot_date: snapshotData.snapshotDate ?? new Date(),
            result_code: this.parseUrlFinderResultCode(snapshotData.resultCode),
            tested_at: snapshotData.testedAt,
            metric_values: {
              createMany: {
                data: snapshotData.metricValues
                  ?.map((metric) => {
                    const metricId = metricIdByType.get(metric.metricType);
                    if (!metricId) return null;

                    return {
                      metric_id: metricId,
                      provider: snapshotData.provider,
                      value: metric.value,
                      tested_at: metric.testedAt,
                    };
                  })
                  .filter(Boolean),
              },
            },
          },
        }),
      ),
    );
  }

  public async getUrlFinderMetricData(
    startDate?: Date,
    endDate?: Date,
    metricType?: StorageProviderUrlFinderMetricType,
  ) {
    return await this.prismaService.storage_provider_url_finder_metric_value.findMany(
      {
        where: {
          tested_at: {
            gte: startDate,
            lte: endDate,
          },
          metric: {
            metric_type: metricType,
          },
        },
        include: {
          metric: true,
        },
      },
    );
  }

  public async getUrlFinderSnapshotsForProviders(
    startDate?: Date,
    endDate?: Date,
    includeMetrics = false,
  ) {
    return await this.prismaService.storage_provider_url_finder_daily_snapshot.findMany(
      {
        where: {
          tested_at: {
            gte: startDate,
            lte: endDate,
          },
        },
        ...(includeMetrics && {
          include: {
            metric_values: {
              include: {
                metric: true,
              },
            },
          },
        }),
      },
    );
  }

  public generateRetrievalResultCodesDailyHistogram(
    snapshots: {
      provider: string;
      tested_at: Date;
      result_code: StorageProviderUrlFinderMetricResultCodeType;
    }[],
  ): StorageProviderMetricHistogramDailyResponse {
    const groupedByDay = groupBy(snapshots, (row) =>
      DateTime.fromJSDate(row.tested_at).toUTC().startOf('day'),
    );

    const days = Object.entries(groupedByDay).map(([dayIso, daySnapshots]) => {
      const total = daySnapshots.length;

      const counts = daySnapshots.reduce(
        (
          acc: Partial<
            Record<StorageProviderUrlFinderMetricResultCodeType, number>
          >,
          snap,
        ) => {
          acc[snap.result_code] = (acc[snap.result_code] ?? 0) + 1;
          return acc;
        },
        {},
      );

      const results = Object.entries(counts).map(([code, count]) => {
        const percentage = total ? count / total : 0;

        return new StorageProviderMetricHistogramResult(
          code,
          count,
          stringToNumber(percentage.toFixed(4)),
        );
      });

      return new StorageProviderMetricHistogramDay(
        new Date(dayIso),
        total,
        results,
      );
    });

    days.sort((a, b) => a.day.getTime() - b.day.getTime());

    return new StorageProviderMetricHistogramDailyResponse(
      snapshots.length,
      days,
      this.RESULT_CODE_META,
    );
  }
}
