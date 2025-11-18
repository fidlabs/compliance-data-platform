import { HttpService } from '@nestjs/axios';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvidersMetricType } from 'prisma/generated/client';
import { lastValueFrom } from 'rxjs';
import { PrismaService } from 'src/db/prisma.service';
import {
  SliStorageProviderMetricData,
  SliStorageProviderUrlFinderResponse,
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

  public async fetchLastSlisForAllProviders(): Promise<
    SliStorageProviderUrlFinderResponse[]
  > {
    const endpoint = `${this.URL_FINDER_API_URL}/slis`;

    const { data } = await lastValueFrom(
      this.httpService.get<SliStorageProviderUrlFinderResponse[]>(endpoint),
    );

    return data;
  }

  public async fetchLastSlisForProvider(
    storageProviderId: string,
    clientId?: string,
  ): Promise<SliStorageProviderUrlFinderResponse> {
    const endpoint = `${this.URL_FINDER_API_URL}/slis/find/${storageProviderId}${clientId ? `/${clientId}` : ''}`;

    const { data } = await lastValueFrom(
      this.httpService.get<SliStorageProviderUrlFinderResponse>(endpoint),
    );

    return data;
  }

  public async fetchHistoricalSlisForProvider(
    storageProviderId: string,
    clientId?: string,
    options?: { from: string; to: string },
  ): Promise<SliStorageProviderMetricData[]> {
    const endpoint = `${this.URL_FINDER_API_URL}/slis/find/${storageProviderId}${clientId ? `/${clientId}` : ''} ${options ? `?from=${options.from}&to=${options.to}` : ''}`;

    const { data } = await lastValueFrom(
      this.httpService.get<SliStorageProviderMetricData[]>(endpoint),
    );

    return data;
  }

  public async storeSliMetricForProviders(
    metricType: StorageProvidersMetricType,
    storageProviderMetricData: SliStorageProviderMetricData[],
  ): Promise<void> {
    const createOrUpdateMetric = {
      metricType,
      name: this.getSliMetricName(metricType),
      description: this.getSliMetricDescription(metricType),
      unit: this.getSliMetricUnit(metricType),
    };

    const metric = await this.prismaService.storage_provider_sli_metric.upsert({
      where: {
        metricType,
      },
      create: createOrUpdateMetric,
      update: createOrUpdateMetric, // in case description or name changes
    });

    const data = storageProviderMetricData.map((row) => ({
      metricId: metric.id,
      providerId: row.providerId,
      value: row.value,
      update_date: row.lastUpdateAt,
    }));

    console.log(
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
      [StorageProvidersMetricType.RETRIEVABILITY]: 'Retrievability',
      [StorageProvidersMetricType.RETENTION]: 'Retention',
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
      [StorageProvidersMetricType.RETRIEVABILITY]: 'Retrievability percentage',
      [StorageProvidersMetricType.RETENTION]:
        'Consensus failures of PoRep Interrogating the PDP proofs continuity',
    };

    return SLI_METRIC_DESCRIPTION[storageProviderMetric];
  }

  private getSliMetricUnit(storageProviderMetric: StorageProvidersMetricType) {
    const SLI_METRIC_UNIT: Record<
      keyof typeof StorageProvidersMetricType,
      string
    > = {
      [StorageProvidersMetricType.TTFB]: 'ms',
      [StorageProvidersMetricType.RETRIEVABILITY]: '%',
      [StorageProvidersMetricType.RETENTION]: 'qty',
    };

    return SLI_METRIC_UNIT[storageProviderMetric];
  }
}
