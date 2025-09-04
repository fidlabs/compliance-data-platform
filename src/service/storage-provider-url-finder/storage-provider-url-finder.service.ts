import { HttpService } from '@nestjs/axios';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cacheable } from 'src/utils/cacheable';
import { Retryable } from 'src/utils/retryable';
import { UrlFinderApiService } from '../url-finder-api/url-finder-api.service';

@Injectable()
export class StorageProviderUrlFinderService {
  private readonly logger = new Logger(StorageProviderUrlFinderService.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly httpService: HttpService,
    private readonly urlFinderApiService: UrlFinderApiService,
  ) {}

  // returns 0 - 1
  public async fetchRetrievability(
    storageProviderId: string,
    clientId?: string,
  ): Promise<number | null> {
    try {
      const data = await this._fetchRetrievability(storageProviderId, clientId);
      if (data.result !== 'Success') {
        // noinspection ExceptionCaughtLocallyJS
        throw new Error(`URL finder returned ${data.result}`);
      }

      // this.logger.debug(
      //   `Fetched URL finder retrievability for ${storageProviderId}${clientId ? '/' + clientId : ''}: ${data.retrievability_percent}%`,
      // );

      return data.retrievability_percent / 100;
    } catch (err) {
      this.logger.warn(
        `Error fetching URL finder retrievability for ${storageProviderId}${clientId ? '/' + clientId : ''}: ${err.message}`,
      );

      return null;
    }
  }

  @Cacheable({ ttl: 1000 * 60 * 60 * 24 }) // 24 hours
  private async _fetchRetrievability(
    storageProviderId: string,
    clientId?: string,
  ) {
    return await this.__fetchRetrievability(storageProviderId, clientId);
  }

  @Retryable({ retries: 5, delayMin: 3000, delayMax: 6000 }) // 3 - 6 seconds random delay
  private async __fetchRetrievability(
    storageProviderId: string,
    clientId?: string,
  ) {
    return await this.urlFinderApiService.fetchRetrievability(
      storageProviderId,
      clientId,
    );
  }
}
