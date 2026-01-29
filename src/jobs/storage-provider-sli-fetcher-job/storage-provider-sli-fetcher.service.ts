import { Injectable, Logger } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import * as _ from 'lodash';
import { groupBy } from 'lodash';
import { DateTime } from 'luxon';
import { StorageProvidersMetricType } from 'prisma/generated/client';
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

          const chunkMetricsToInsert = sliDataForChunk.map((provider) => {
            const {
              provider_id,
              retrievability_percent,
              tested_at,
              performance,
            } = provider;

            return [
              {
                providerId: provider_id,
                metricType: StorageProvidersMetricType.RPA_RETRIEVABILITY,
                value: retrievability_percent || 0,
                lastUpdateAt: tested_at,
              },
              {
                providerId: provider_id,
                metricType: StorageProvidersMetricType.TTFB,
                value: performance?.bandwidth?.ttfb_ms || 0,
                lastUpdateAt: performance?.bandwidth?.tested_at,
              },
              {
                providerId: provider_id,
                metricType: StorageProvidersMetricType.BANDWIDTH,
                value: performance?.bandwidth?.download_speed_mbps || 0,
                lastUpdateAt: performance?.bandwidth?.tested_at,
              },
              {
                providerId: provider_id,
                metricType: StorageProvidersMetricType.RETENTION,
                value:
                  dmobProvidersRetention.find(
                    (x) => x.provider === provider_id.substring(2),
                  )?.amount_of_terminated_deals || 0,
                lastUpdateAt: DateTime.utc().toISO(),
              },
            ];
          });

          metricsToInsert.push(...chunkMetricsToInsert.flat());
        }

        const groupedByMetrics = groupBy(metricsToInsert, 'metricType');

        await Promise.all(
          Object.keys(groupedByMetrics).map(async (key) => {
            await this.storageProviderUrlFinderService.storeSliMetricForStorageProviders(
              key as StorageProvidersMetricType,
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
