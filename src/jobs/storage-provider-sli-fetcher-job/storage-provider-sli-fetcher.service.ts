import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { PrismaService } from 'src/db/prisma.service';
import { CidContactService } from 'src/service/cid-contact/cid-contact.service';
import { IPNIProvider } from 'src/service/cid-contact/types.cid-contact';
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

  @Cron('0 23 * * 1,4') // At 23:00 on Monday and Thursday
  public async runStorageProviderSliFetcherJob() {
    if (!this.jobInProgress) {
      this.jobInProgress = true;

      try {
        this.logger.log('Starting Storage Provider SLIs Fetcher job');
        this.healthy = true;

        await this._runStorageProviderSliFetcherJob();

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

  private async _runStorageProviderSliFetcherJob() {
    const providers = await this.cidContactService.getIPNIProviders();

    for (const [i, provider] of providers.entries()) {
      try {
        this.logger.debug(
          `Starting Storage Provider SLIs Fetcher Fetcher job for ${provider.AddrInfo.ID}: ${i + 1}/${providers.length}`,
        );

        await this.fetchAndStoreStorageProviderSlis(provider);
      } catch (err) {
        this.logger.warn(
          `Error during IPNI Advertisement Fetcher job for ${provider.AddrInfo.ID}: ${err.message}`,
        );
      }
    }
  }

  private async fetchAndStoreStorageProviderSlis(
    provider: IPNIProvider,
  ): Promise<void> {
    console.log(`Fetching SLIs for provider ${provider.AddrInfo.ID}`);
    const retention = await this.fetchRetentionForProvider(
      provider.AddrInfo.ID,
    );
    const ttfb = await this.fetchTTFBForProvider(provider.AddrInfo.ID);
    console.log(`Fetching SLIs for provider ${provider.AddrInfo.ID} completed`);
  }

  private async fetchRetentionForProvider(provider: string): Promise<number> {
    // TODO implement actual fetching of retention
    return Math.floor(Math.random() * 365);
  }

  private async waitForJobCompletion(
    endpoint: string,
    jobId: string,
  ): Promise<any> {
    const maxRetries = 20;
    const interval = 3000; // 3 seconds

    for (let i = 0; i < maxRetries; i++) {
      const res = await fetch(endpoint + '/jobs/' + jobId, { method: 'GET' });
      const data = await res.json();

      if (data.ok) {
        return data;
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error('Timeout waiting for job to complete');
  }

  private async fetchTTFBForProvider(provider: string): Promise<number> {
    const workingUrl =
      await this.storageProviderUrlFinderService.fetchPieceWorkingUrlForProvider(
        provider,
      );

    const bmsApiUrl = this.configService.get<string>('BMS_API_URL');

    const response = await fetch(bmsApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.configService.get<string>('BMS_API_AUTH_TOKEN')}`,
      },
      body: JSON.stringify({
        entity: '',
        log_interval_ms: 100,
        note: '',
        routing_key: 'us_east',
        size_mb: 10,
        url: workingUrl,
        worker_count: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch TTFB for provider ${provider}: ${response.status} ${response.statusText}`,
      );
    }

    const data: {
      details: {
        end_range: number;
        entity: string;
        log_interval_ms: number;
        note: string;
        size_mb: number;
        start_range: number;
        target_worker_count: number;
        workers_count: number;
      };
      id: string;
      routing_key: string;
      status: string;
      url: string;
      sub_jobs: [
        {
          deadline_at: string;
          details: string;
          id: string;
          job_id: string;
          status: string;
          type: string;
        },
      ];
    } = await response.json();

    const jobResult = await this.waitForJobCompletion(bmsApiUrl, data.id);

    return Math.floor(Math.random() * 1000);
  }
}
