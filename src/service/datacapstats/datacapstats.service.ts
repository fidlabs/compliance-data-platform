import { Inject, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  DataCapStatsVerifiedClientData,
  DataCapStatsVerifiedClientsResponse,
} from './types.datacapstats';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  DataCapStatsVerifierData,
  DataCapStatsVerifiersResponse,
} from './types.datacapstats';
import { DataCapStatsPublicVerifiedClientsResponse } from './types.datacapstats';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { Cacheable } from 'src/utils/cacheable';

// TODO soon to be deprecated
@Injectable()
export class DataCapStatsService {
  private readonly logger = new Logger(DataCapStatsService.name);
  private apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  @Cacheable({ ttl: 1000 * 60 * 60 * 24 }) // 24 hours
  public async fetchPrimaryClientDetails(
    clientId: string,
  ): Promise<DataCapStatsVerifiedClientData> {
    const endpoint = `https://api.datacapstats.io/api/getVerifiedClients?filter=${clientId}`;

    const { data } = (
      await firstValueFrom(
        this.httpService.get<DataCapStatsVerifiedClientsResponse>(endpoint),
      )
    )?.data;

    if (!data || data.length === 0) return null;

    return data.reduce((prev, curr) =>
      parseInt(prev.initialAllowance) > parseInt(curr.initialAllowance)
        ? prev
        : curr,
    );
  }

  public async getVerifiedClients(
    allocatorAddress: string,
  ): Promise<DataCapStatsPublicVerifiedClientsResponse> {
    const apiKey = await this.fetchApiKey();
    const endpoint = `https://api.datacapstats.io/public/api/getVerifiedClients/${allocatorAddress}`;

    const { data } = await firstValueFrom(
      this.httpService.get<DataCapStatsPublicVerifiedClientsResponse>(
        endpoint,
        {
          headers: {
            'X-API-KEY': apiKey,
          },
        },
      ),
    );

    return data;
  }

  public async getVerifierData(
    allocatorIdOrAddress: string,
  ): Promise<DataCapStatsVerifierData> {
    return (await this._getVerifiers(allocatorIdOrAddress))[0];
  }

  public async getVerifiers(): Promise<DataCapStatsVerifierData[]> {
    return this._getVerifiers();
  }

  private async _getVerifiers(
    allocatorIdOrAddress?: string,
  ): Promise<DataCapStatsVerifierData[]> {
    const apiKey = await this.fetchApiKey();
    const endpoint = `https://api.datacapstats.io/public/api/getVerifiers`;

    const { data } = await firstValueFrom(
      this.httpService.get<DataCapStatsVerifiersResponse>(endpoint, {
        headers: {
          'X-API-KEY': apiKey,
        },
        params: allocatorIdOrAddress
          ? {
              page: 1,
              limit: 1,
              filter: allocatorIdOrAddress,
            }
          : undefined,
      }),
    );

    return data.data;
  }

  private async fetchApiKey(): Promise<string> {
    if (this.apiKey) {
      return this.apiKey;
    } else {
      const apiKey = this.configService.get<string>('DATACAPSTATS_API_KEY');
      if (apiKey != undefined) {
        this.apiKey = apiKey;
        return apiKey;
      }
    }

    const endpoint = `http://api.datacapstats.io/public/api/getApiKey`;

    const { data } = await firstValueFrom(
      this.httpService.get<string>(endpoint),
    );

    this.apiKey = data;
    return data;
  }
}
