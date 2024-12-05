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

@Injectable()
export class DataCapStatsService {
  private readonly logger = new Logger(DataCapStatsService.name);
  constructor(private readonly httpService: HttpService) {}

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

  async getVerifiersData(
    verifierAddress: string,
  ): Promise<DataCapStatsVerifierData> {
    const apiKey = await this.getApiKey();
    const endpoint = `https://api.datacapstats.io/public/api/getVerifiers`;

    const { data } = await firstValueFrom(
      this.httpService
        .get<DataCapStatsVerifiersResponse>(endpoint, {
          headers: {
            'X-API-KEY': apiKey,
          },
          params: {
            page: 1,
            limit: 1,
            filter: verifierAddress,
          },
        })
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(error.response.data);
            throw error;
          }),
        ),
    );
    return data.data[0];
  }

  async getApiKey() {
    const endpoint = `http://api.datacapstats.io/public/api/getApiKey`;

    const { data } = await firstValueFrom(
      this.httpService.get<string>(endpoint).pipe(
        catchError((error: AxiosError) => {
          this.logger.error(error.response.data);
          throw error;
        }),
      ),
    );
    return data;
  }
}
