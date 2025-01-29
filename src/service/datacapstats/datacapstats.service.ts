import { Inject, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  VerifiedClientData,
  VerifiedClientResponse,
} from './types.datacapstats';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  DataCapStatsVerifierData,
  DataCapStatsVerifiersResponse,
} from './types.verifiers.datacapstats';
import { DataCapStatsVerifiedClientsResponse } from './types.verified-clients.datacapstats';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';

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

  async fetchPrimaryClientDetails(
    clientId: string,
  ): Promise<VerifiedClientData> {
    const cachedData =
      await this.cacheManager.get<VerifiedClientData>(clientId);

    if (cachedData) return cachedData;

    const endpoint = `https://api.datacapstats.io/api/getVerifiedClients?filter=${clientId}`;

    const { data } = (
      await firstValueFrom(
        this.httpService.get<VerifiedClientResponse>(endpoint),
      )
    )?.data;

    if (!data || data.length === 0) return null;

    const result = data.reduce((prev, curr) =>
      parseInt(prev.initialAllowance) > parseInt(curr.initialAllowance)
        ? prev
        : curr,
    );

    await this.cacheManager.set(clientId, result, 1000 * 60 * 60 * 24); // 24 hours

    return result;
  }

  async getVerifiedClients(allocatorAddress: string) {
    const apiKey = await this.fetchApiKey();
    const endpoint = `https://api.datacapstats.io/public/api/getVerifiedClients/${allocatorAddress}`;

    const { data } = await firstValueFrom(
      this.httpService.get<DataCapStatsVerifiedClientsResponse>(endpoint, {
        headers: {
          'X-API-KEY': apiKey,
        },
      }),
    );

    return {
      data: data.data.map((e) => ({
        ...e,
        allowanceArray: e.allowanceArray.map((a) => ({
          ...a,
          allowance: Number(a.allowance),
        })),
      })),
      count: data.count,
    };
  }

  async getVerifierData(
    allocatorIdOrAddress: string,
  ): Promise<DataCapStatsVerifierData> {
    return (await this._getVerifiers(allocatorIdOrAddress))[0];
  }

  async getVerifiers(): Promise<DataCapStatsVerifierData[]> {
    return this._getVerifiers();
  }

  private async _getVerifiers(
    allocatorIdOrAddress?: string | null,
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

  async fetchApiKey(): Promise<string> {
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
