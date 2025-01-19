import { Injectable, Logger, UseInterceptors } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import {
  VerifiedClientData,
  VerifiedClientResponse,
} from './types.datacapstats';
import { CacheInterceptor } from '@nestjs/cache-manager';
import {
  DataCapStatsVerifierData,
  DataCapStatsVerifiersResponse,
} from './types.verifiers.datacapstats';
import { DataCapStatsVerifiedClientsResponse } from './types.verified-clients.datacapstats';
import { ConfigService } from '@nestjs/config';

// TODO soon to be deprecated
@Injectable()
export class DataCapStatsService {
  private readonly logger = new Logger(DataCapStatsService.name);
  private apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  @UseInterceptors(CacheInterceptor)
  async fetchClientDetails(clientId: string): Promise<VerifiedClientResponse> {
    const endpoint = `https://api.datacapstats.io/api/getVerifiedClients?limit=10&page=1&filter=${clientId}`;

    const { data } = await firstValueFrom(
      this.httpService.get<VerifiedClientResponse>(endpoint).pipe(
        catchError((error: AxiosError) => {
          this.logger.error(error.response.data);
          throw error;
        }),
      ),
    );

    return data;
  }

  @UseInterceptors(CacheInterceptor)
  async fetchPrimaryClientDetails(
    clientId: string,
  ): Promise<VerifiedClientData> {
    return this.findPrimaryClientDetails(
      (await this.fetchClientDetails(clientId))?.data,
    );
  }

  private findPrimaryClientDetails(
    verifiedClientData?: VerifiedClientData[],
  ): VerifiedClientData {
    if (!verifiedClientData || verifiedClientData.length === 0) return null;

    return verifiedClientData.reduce((prev, curr) =>
      parseInt(prev.initialAllowance) > parseInt(curr.initialAllowance)
        ? prev
        : curr,
    );
  }

  async getVerifiedClients(allocatorAddress: string) {
    const apiKey = await this.fetchApiKey();
    const endpoint = `https://api.datacapstats.io/public/api/getVerifiedClients/${allocatorAddress}`;

    const { data } = await firstValueFrom(
      this.httpService
        .get<DataCapStatsVerifiedClientsResponse>(endpoint, {
          headers: {
            'X-API-KEY': apiKey,
          },
        })
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(error.response.data);
            throw error;
          }),
        ),
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
      this.httpService
        .get<DataCapStatsVerifiersResponse>(endpoint, {
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
        })
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(error.response.data);
            throw error;
          }),
        ),
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
      this.httpService.get<string>(endpoint).pipe(
        catchError((error: AxiosError) => {
          this.logger.error(error.response.data);
          throw error;
        }),
      ),
    );

    this.apiKey = data;
    return data;
  }
}
