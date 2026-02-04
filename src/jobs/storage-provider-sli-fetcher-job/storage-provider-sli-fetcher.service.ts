import { Injectable, Logger } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import * as _ from 'lodash';
import { groupBy } from 'lodash';
import { DateTime } from 'luxon';
import { StorageProviderSliMetricType } from 'prisma/generated/client';
import { getStorageProviderRetentionSli } from 'prismaDmob/generated/client/sql';
import { PrismaService } from 'src/db/prisma.service';
import { PrismaDmobService } from 'src/db/prismaDmob.service';
import { StorageProviderUrlFinderService } from 'src/service/storage-provider-url-finder/storage-provider-url-finder.service';
import { SliStorageProviderMetricChunkData } from 'src/service/storage-provider-url-finder/types.storage-provider-url-finder.service';

@Injectable()
export class StorageProviderSliFetcherJobService extends HealthIndicator {
  private readonly logger = new Logger(
    StorageProviderSliFetcherJobService.name,
  );
  private healthy = true;
  private jobInProgress = false;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly prismaDmobService: PrismaDmobService,
    private readonly storageProviderUrlFinderService: StorageProviderUrlFinderService,
  ) {
    super();
  }

  public async getHealth(): Promise<HealthIndicatorResult> {
    const result = this.getStatus(
      StorageProviderSliFetcherJobService.name,
      this.healthy,
      {},
    );

    if (this.healthy) return result;
    throw new HealthCheckError('Healthcheck failed', result);
  }

  public async runStorageProviderSliFetcherJob() {
    if (!this.jobInProgress) {
      this.jobInProgress = true;

      try {
        this.logger.log('Starting Storage Provider SLIs Fetcher job');
        this.healthy = true;

        const providers = await this.prismaService.provider.findMany({});
        const providersToDmobRequest = providers.map((x) => x.id.substring(2));

        const dmobProvidersRetention: {
          provider: string;
          amount_of_terminated_deals: number;
        }[] = await this.prismaDmobService.$queryRawTyped(
          getStorageProviderRetentionSli(providersToDmobRequest),
        );

        const storageProvidersChunks = _.chunk(providers, 50);

        const metricsToInsert: SliStorageProviderMetricChunkData[] = [];

        for (const spChunk of storageProvidersChunks) {
          const sliDataForChunk =
            await this.storageProviderUrlFinderService.fetchLastStorageProviderDataInBulk(
              spChunk.map((x) => x.id),
            );

          const chunkMetricsToInsert = sliDataForChunk.providers.map(
            (provider) => {
              const {
                provider_id,
                retrievability_percent,
                tested_at,
                performance,
              } = provider;

              return [
                {
                  providerId: provider_id,
                  metricType: StorageProviderSliMetricType.RPA_RETRIEVABILITY,
                  value: retrievability_percent,
                  lastUpdateAt: tested_at,
                },
                {
                  providerId: provider_id,
                  metricType: StorageProviderSliMetricType.TTFB,
                  value: performance?.bandwidth?.ttfb_ms,
                  lastUpdateAt: performance?.bandwidth?.tested_at,
                },
                {
                  providerId: provider_id,
                  metricType: StorageProviderSliMetricType.BANDWIDTH,
                  value: performance?.bandwidth?.download_speed_mbps,
                  lastUpdateAt: performance?.bandwidth?.tested_at,
                },
                {
                  providerId: provider_id,
                  metricType: StorageProviderSliMetricType.RETENTION,
                  value: dmobProvidersRetention.find(
                    (x) => x.provider === provider_id.substring(2),
                  )?.amount_of_terminated_deals,
                  lastUpdateAt: DateTime.utc().toISO(),
                },
              ];
            },
          );

          const filteredChunkMetricsToInsert = chunkMetricsToInsert
            .flat()
            .filter((x) => x.value !== null && x.value !== undefined);

          metricsToInsert.push(...filteredChunkMetricsToInsert);
        }

        const groupedByMetrics = groupBy(metricsToInsert, 'metricType');

        await Promise.all(
          Object.keys(groupedByMetrics).map(async (key) => {
            await this.storageProviderUrlFinderService.storeSliMetricForStorageProviders(
              key as StorageProviderSliMetricType,
              groupedByMetrics[key],
            );
          }),
        );

        this.logger.log(`Finishing Storage Provider SLIs Fetcher job`);
      } catch (err) {
        this.healthy = false;
        this.logger.error(
          `Error while running Storage Provider SLIs Fetcher job: ${err.message}`,
          err.cause?.stack || err.stack,
        );
      } finally {
        this.jobInProgress = false;
      }
    } else {
      this.logger.warn(
        'Storage Provider SLIs Fetcher job is already in progress - skipping next execution',
      );
    }
  }
}
