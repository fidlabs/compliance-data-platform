import { HttpService } from '@nestjs/axios';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvidersMetricType } from 'prisma/generated/client';
import { lastValueFrom } from 'rxjs';
import { PrismaService } from 'src/db/prisma.service';
import {
  SliStorageProviderMetricData,
  UrlFinderStorageProviderBulkResponse,
  UrlFinderStorageProviderData,
} from './types.storage-provider-url-finder.service';

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

  public async fetchLastStorageProviderData(
    storageProviderId: string,
    clientId?: string,
  ): Promise<UrlFinderStorageProviderData | null> {
    const endpoint = `${this.URL_FINDER_API_URL}/providers/${storageProviderId}${clientId ? `/clients/${clientId}` : ''}`;

    const { data } = await lastValueFrom(
      this.httpService.get<UrlFinderStorageProviderData | null>(endpoint),
    );

    return data;
  }

  public async fetchLastStorageProviderDataInBulk(
    storageProviderIds: string[],
  ): Promise<UrlFinderStorageProviderData[] | null> {
    const endpoint = `${this.URL_FINDER_API_URL}/providers/bulk`;

    const { data } = await lastValueFrom(
      this.httpService.post<UrlFinderStorageProviderBulkResponse | null>(
        endpoint,
        {
          provider_ids: storageProviderIds,
        },
      ),
    );

    return data.providers;
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
    metricType: StorageProvidersMetricType,
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

    await this.prismaService.storage_provider_sli.createMany({ data });
  }

  private getSliMetricName(clientReportCheck: StorageProvidersMetricType) {
    const SLI_METRIC_NAME: Record<
      keyof typeof StorageProvidersMetricType,
      string
    > = {
      [StorageProvidersMetricType.TTFB]: 'TTFB',
      [StorageProvidersMetricType.RPA_RETRIEVABILITY]: 'RPA Retrievability',
      [StorageProvidersMetricType.RETENTION]: 'Retention',
      [StorageProvidersMetricType.BANDWIDTH]: 'Bandwith',
    };

    return SLI_METRIC_NAME[clientReportCheck];
  }

  private getSliMetricDescription(
    storageProviderMetric: StorageProvidersMetricType,
  ) {
    const SLI_METRIC_DESCRIPTION: Record<
      keyof typeof StorageProvidersMetricType,
      string
    > = {
      [StorageProvidersMetricType.TTFB]: 'Time to first byte (TTFB)',
      [StorageProvidersMetricType.RPA_RETRIEVABILITY]:
        'RPA Retrievability percentage',
      [StorageProvidersMetricType.RETENTION]:
        'Consensus failures of PoRep Interrogating the PDP proofs continuity',
      [StorageProvidersMetricType.BANDWIDTH]: 'Download bandwidth in Mbps',
    };

    return SLI_METRIC_DESCRIPTION[storageProviderMetric];
  }

  private getSliMetricUnit(storageProviderMetric: StorageProvidersMetricType) {
    const SLI_METRIC_UNIT: Record<
      keyof typeof StorageProvidersMetricType,
      string
    > = {
      [StorageProvidersMetricType.TTFB]: 'ms',
      [StorageProvidersMetricType.RPA_RETRIEVABILITY]: '%',
      [StorageProvidersMetricType.RETENTION]: 'qty',
      [StorageProvidersMetricType.BANDWIDTH]: 'Mbps',
    };

    return SLI_METRIC_UNIT[storageProviderMetric];
  }
}
