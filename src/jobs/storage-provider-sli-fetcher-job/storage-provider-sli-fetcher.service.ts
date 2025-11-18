import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { lastValueFrom } from 'rxjs';
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

  @Cron('0 23 * * 1,4') // At 23:00 on Monday and Thursday
  public async runStorageProviderSliFetcherJob() {
    if (!this.jobInProgress) {
      this.jobInProgress = true;

      try {
        this.logger.log('Starting Storage Provider SLIs Fetcher job');
        this.healthy = true;

        const slis =
          await this.storageProviderUrlFinderService.fetchLastSlisForAllProviders();

        const storeSliPromises = slis.map((sli) =>
          this.storageProviderUrlFinderService.storeSliForProvider(sli),
        );
        await Promise.all(storeSliPromises);

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
