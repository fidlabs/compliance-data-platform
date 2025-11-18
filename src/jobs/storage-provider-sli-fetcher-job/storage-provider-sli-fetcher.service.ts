import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { groupBy } from 'lodash';
import { StorageProvidersMetricType } from 'prisma/generated/client';
import { PrismaService } from 'src/db/prisma.service';
import { CidContactService } from 'src/service/cid-contact/cid-contact.service';
import { StorageProviderUrlFinderService } from 'src/service/storage-provider-url-finder/storage-provider-url-finder.service';

@Injectable()
export class StorageProviderSliFetcherJobService extends HealthIndicator {
  private readonly logger = new Logger(
    StorageProviderSliFetcherJobService.name,
  );
  private healthy = true;
  private jobInProgress = false;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly cidContactService: CidContactService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
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

  // @Cron('0 23 * * 1,4') // At 23:00 on Monday and Thursday
  @Cron(CronExpression.EVERY_MINUTE)
  public async runStorageProviderSliFetcherJob() {
    if (!this.jobInProgress) {
      this.jobInProgress = true;

      try {
        this.logger.log('Starting Storage Provider SLIs Fetcher job');
        this.healthy = true;

        const providersWithSli = [
          {
            provider_id: 'f01234',
            retrievability_percent: 123,
            tested_at: new Date(),
          },
          {
            provider_id: 'f01235',
            retrievability_percent: 123456,
            tested_at: new Date(),
          },
          {
            provider_id: 'f0123556',
            retrievability_percent: 123456789,
            tested_at: new Date(),
          },
        ];
        // await this.storageProviderUrlFinderService.fetchLastSlisForAllProviders();

        const metricsForSPs = providersWithSli.map((provider) => ({
          providerId: provider.provider_id,
          metrics: [
            {
              type: StorageProvidersMetricType.RETRIEVABILITY,
              value: provider.retrievability_percent,
              tested_at: provider.tested_at,
            },
            {
              type: StorageProvidersMetricType.TTFB,
              value: 0,
              tested_at: provider.tested_at,
            },
          ],
        }));

        const flattened = metricsForSPs.flatMap((sp) =>
          sp.metrics.map((m) => ({
            type: m.type,
            providerId: sp.providerId,
            value: m.value,
            update_date: m.tested_at,
          })),
        );

        const groupedByMetrics = groupBy(flattened, 'type');

        await Promise.all(
          Object.keys(groupedByMetrics).map(async (key) => {
            this.storageProviderUrlFinderService.storeSliMetricForProviders(
              key as StorageProvidersMetricType,
              groupedByMetrics[key].map((item) => ({
                providerId: item.providerId,
                value: item.value,
                lastUpdateAt: item.update_date,
              })),
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
