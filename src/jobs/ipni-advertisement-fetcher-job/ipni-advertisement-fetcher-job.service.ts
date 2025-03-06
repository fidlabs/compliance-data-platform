import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { PrismaService } from 'src/db/prisma.service';
import { CidContactService } from 'src/service/cid-contact/cid-contact.service';
import {
  IPNIAdvertisement,
  IPNIProvider,
} from 'src/service/cid-contact/types.cid-contact';

@Injectable()
export class IpniAdvertisementFetcherJobService extends HealthIndicator {
  private readonly logger = new Logger(IpniAdvertisementFetcherJobService.name);
  private healthy = true;
  private jobInProgress = false;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly cidContactService: CidContactService,
  ) {
    super();
  }

  public async getHealth(): Promise<HealthIndicatorResult> {
    const result = this.getStatus(
      IpniAdvertisementFetcherJobService.name,
      this.healthy,
      {},
    );

    if (this.healthy) return result;
    throw new HealthCheckError('Healthcheck failed', result);
  }

  @Cron(CronExpression.EVERY_DAY_AT_8PM)
  public async runIPNIAdvertisementFetcherJob() {
    if (!this.jobInProgress) {
      this.jobInProgress = true;

      try {
        this.logger.log('Starting IPNI Advertisement Fetcher job');
        this.healthy = true;

        await this._runIPNIAdvertisementFetcherJob();

        this.logger.log(`Finishing IPNI Advertisement Fetcher job`);
      } catch (err) {
        this.healthy = false;
        this.logger.error(
          `Error while running IPNI Advertisement Fetcher job: ${err.message}`,
          err.cause || err.stack,
        );
      } finally {
        this.jobInProgress = false;
      }
    } else {
      this.logger.warn(
        'IPNI Advertisement Fetcher job is already in progress - skipping next execution',
      );
    }
  }

  private async _runIPNIAdvertisementFetcherJob() {
    // TODO error handling, count fails, success, prometheus metrics

    const providers = await this.cidContactService.getIPNIProviders();

    for (const [i, provider] of providers.entries()) {
      try {
        this.logger.debug(
          `Starting IPNI Advertisement Fetcher job for ${provider.AddrInfo.ID}: ${i + 1}/${providers.length}`,
        );

        await this.fetchAndStoreAdvertisementsByProvider(provider);
      } catch (err) {
        this.logger.error(
          `Error during IPNI Advertisement Fetcher job for ${provider.AddrInfo.ID}: ${err.message}`,
        );
      }
    }
  }

  private async fetchAndStoreAdvertisementsByProvider(
    provider: IPNIProvider,
  ): Promise<void> {
    const baseUrl =
      await this.cidContactService.getIPNIPublisherBaseUrl(provider);

    const lastAd = await this.cidContactService.getIPNIPublisherAdvertisement(
      baseUrl,
      provider.LastAdvertisement['/'],
    );

    // fetch and store max 10 newest ads
    return await this.runAdvertisementBackfillProcess(lastAd, baseUrl, 10);
  }

  // adds currentAd and maximum of adLimit previous ads to the database
  // returns with no error when ad is already in the database
  private async runAdvertisementBackfillProcess(
    currentAd: IPNIAdvertisement,
    baseUrl: string,
    adLimit?: number,
  ): Promise<void> {
    do {
      try {
        await this.prismaService.ipni_publisher_advertisement.create({
          data: {
            id: currentAd.ID,
            previous_id: currentAd.PreviousID?.['/'],
            publisher_id: currentAd.Provider,
            context_id: currentAd.ContextID['/'].bytes,
            entries_number:
              await this.cidContactService.getIPNIPublisherAdvertisementEntriesNumber(
                baseUrl,
                currentAd,
              ),
            is_rm: currentAd.IsRm,
          },
        });
      } catch (err) {
        if (err.code === 'P2002') return;
        else throw err;
      }

      currentAd = currentAd.PreviousID?.['/']
        ? await this.cidContactService.getIPNIPublisherAdvertisement(
            baseUrl,
            currentAd.PreviousID['/'],
          )
        : undefined;
    } while (
      currentAd &&
      (adLimit === undefined || adLimit === null || adLimit-- > 0)
    );
  }
}
