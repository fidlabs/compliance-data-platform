import { HttpService } from '@nestjs/axios';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { Cacheable } from 'src/utils/cacheable';
import { Retryable } from 'src/utils/retryable';

@Injectable()
export class StorageProviderUrlFinderService {
  private readonly logger = new Logger(StorageProviderUrlFinderService.name);
  private readonly URL_FINDER_API_URL: string;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.URL_FINDER_API_URL =
      this.configService.get<string>('URL_FINDER_API_URL');
  }

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

      return data.retrievability_percent / 100;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      // this.logger.warn(
      //   `Error fetching URL finder retrievability for ${storageProviderId}${clientId ? '/' + clientId : ''}: ${err.message}`,
      // );

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
    const endpoint = `${this.URL_FINDER_API_URL}/url/retrievability/${storageProviderId}${clientId ? `/${clientId}` : ''}`;

    const { data } = await lastValueFrom(
      this.httpService.get(endpoint, { timeout: 90000 }), // 90 seconds
    );

    return data;
  }

  public async fetchPieceWorkingUrlForProvider(
    storageProviderId: string,
    clientId?: string,
  ): Promise<string | null> {
    try {
      const data = await this._fetchPieceWorkingUrlForProvider(
        storageProviderId,
        clientId,
      );

      if (data.result !== 'Success') {
        this.logger.warn(
          `No piece working URL found for provider ${storageProviderId}` +
            `${clientId ? ' and client ' + clientId : ''}`,
        );

        return null;
      }

      return data.url;
    } catch (err) {
      this.logger.warn(
        `Error fetching URL finder working URL for provider ${storageProviderId}` +
          `${clientId ? ' and client ' + clientId : ''}` +
          `: ${err.message}`,
      );

      return null;
    }
  }

  @Cacheable({ ttl: 1000 * 60 * 60 * 24 }) // 24 hours
  private async _fetchPieceWorkingUrlForProvider(
    storageProviderId: string,
    clientId?: string,
  ) {
    return await this.__fetchPieceWorkingUrlForProvider(
      storageProviderId,
      clientId,
    );
  }

  @Retryable({ retries: 5, delayMin: 3000, delayMax: 6000 }) // 3 - 6 seconds random delay
  public async __fetchPieceWorkingUrlForProvider(
    storageProviderId: string,
    clientId?: string,
  ) {
    const endpoint = `${this.URL_FINDER_API_URL}/url/find/${storageProviderId}${clientId ? `/${clientId}` : ''}`;

    const { data } = await lastValueFrom(
      this.httpService.get<{ result: string; url: string }>(endpoint, {
        timeout: 90000,
      }), // 90 seconds
    );

    return data;
  }
}
