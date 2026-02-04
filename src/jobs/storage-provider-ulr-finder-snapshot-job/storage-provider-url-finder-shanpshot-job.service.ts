import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import * as _ from 'lodash';
import { DateTime } from 'luxon';
import {
  StorageProviderUrlFinderMetricResultCodeType,
  StorageProviderUrlFinderMetricType,
} from 'prisma/generated/client';
import { PrismaService } from 'src/db/prisma.service';
import { StorageProviderUrlFinderService } from 'src/service/storage-provider-url-finder/storage-provider-url-finder.service';
import { StorageProviderUrlFinderMetricValue } from 'src/service/storage-provider-url-finder/types.storage-provider-url-finder.service';
import { isTodayUTC } from 'src/utils/utils';

@Injectable()
export class StorageProviderUrlFinderSnapshotMetricService extends HealthIndicator {
  private readonly logger = new Logger(
    StorageProviderUrlFinderSnapshotMetricService.name,
  );
  private healthy = true;
  private jobInProgress = false;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly storageProviderUrlFinderService: StorageProviderUrlFinderService,
  ) {
    super();
  }

  public async getHealth(): Promise<HealthIndicatorResult> {
    const result = this.getStatus(
      StorageProviderUrlFinderSnapshotMetricService.name,
      this.healthy,
      {},
    );

    if (this.healthy) return result;
    throw new HealthCheckError('Healthcheck failed', result);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  public async fetchLastMetricSnapshotForStorageProviders() {
    if (!this.jobInProgress) {
      this.jobInProgress = true;

      try {
        this.logger.log(
          'Starting creating the storage provider snapshot metrics job',
        );
        this.healthy = true;

        const latestStoredSnapshot =
          await this.prismaService.storage_provider_url_finder_daily_snapshot.findFirst(
            {
              orderBy: {
                snapshot_date: 'desc',
              },
            },
          );

        const latestStoredDate = latestStoredSnapshot
          ? DateTime.fromJSDate(latestStoredSnapshot.snapshot_date, {
              zone: 'UTC',
            })
          : null;

        // skip if job already ran today - only for safety, should not happen due to cron
        if (!!latestStoredDate && isTodayUTC(latestStoredDate)) {
          this.logger.log(
            'Storage provider snapshot metrics already created today - skipping',
          );
          return;
        }

        const providers = await this.prismaService.provider.findMany({});
        const storageProvidersChunks = _.chunk(providers, 100);
        const storageProviderSnapshotsToInsert = [];

        function isSameUtcDay(a: Date, b: Date): boolean {
          return (
            a.getUTCFullYear() === b.getUTCFullYear() &&
            a.getUTCMonth() === b.getUTCMonth() &&
            a.getUTCDate() === b.getUTCDate()
          );
        }

        const snapshotDate = DateTime.now().toUTC().startOf('day').toJSDate();

        for (const spChunk of storageProvidersChunks) {
          const dataForChunk =
            await this.storageProviderUrlFinderService.fetchLastStorageProviderDataInBulk(
              spChunk.map((x) => x.id),
            );

          const chunkMetricsToInsert = dataForChunk.providers.map(
            (provider) => {
              const {
                provider_id,
                retrievability_percent,
                tested_at,
                performance,
                diagnostics,
              } = provider;

              const isPerformanceTestInLastTestDay = isSameUtcDay(
                new Date(performance?.bandwidth?.tested_at),
                new Date(tested_at),
              );

              // keep always RPA retreavability
              const metrics: StorageProviderUrlFinderMetricValue[] = [
                {
                  metricType:
                    StorageProviderUrlFinderMetricType.RPA_RETRIEVABILITY,
                  value: retrievability_percent
                    ? retrievability_percent / 100
                    : null,
                  testedAt: new Date(tested_at),
                },

                performance?.bandwidth?.ttfb_ms &&
                isPerformanceTestInLastTestDay // only if test was done same day as retrievability test
                  ? {
                      metricType: StorageProviderUrlFinderMetricType.TTFB,
                      value: performance?.bandwidth?.ttfb_ms,
                      testedAt: new Date(performance?.bandwidth?.tested_at),
                    }
                  : null,

                performance?.bandwidth?.download_speed_mbps &&
                isPerformanceTestInLastTestDay // only if test was done same day as retrievability test
                  ? {
                      metricType: StorageProviderUrlFinderMetricType.BANDWIDTH,
                      value: performance?.bandwidth?.download_speed_mbps,
                      testedAt: new Date(performance?.bandwidth?.tested_at),
                    }
                  : null,
              ].filter(Boolean);

              return {
                provider: provider_id,
                resultCode:
                  diagnostics?.result_code as StorageProviderUrlFinderMetricResultCodeType,
                snapshotDate: snapshotDate,
                testedAt: new Date(tested_at),
                metricValues: metrics,
              };
            },
          );

          storageProviderSnapshotsToInsert.push(...chunkMetricsToInsert);

          this.logger.log(
            `Processed ${storageProviderSnapshotsToInsert.length} of ${providers.length} storage providers`,
          );
        }

        if (storageProviderSnapshotsToInsert.length) {
          await this.storageProviderUrlFinderService.ensureUrlFinderMetricTypesExist();
          await this.storageProviderUrlFinderService.storeSnapshotMetricsForStorageProviders(
            storageProviderSnapshotsToInsert,
          );
        }
      } catch (err) {
        this.healthy = false;
        this.logger.error(
          `Error while running storage provider snapshot metrics job: ${err.message}`,
          err.cause?.stack || err.stack,
        );
      } finally {
        this.jobInProgress = false;
        this.logger.log(`Finished the storage provider snapshot metrics job`);
      }
    } else {
      this.logger.warn(
        'Storage Provider Snapshot job is already in progress - skipping next execution',
      );
    }
  }
}
