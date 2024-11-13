import { Injectable, Logger, UseInterceptors } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { first } from 'lodash';
import {
  VerifiedClientData,
  VerifiedClientResponse,
} from './types.datacapstats';
import { CacheInterceptor } from '@nestjs/cache-manager';

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

  findPrimaryClientDetails(verifiedClientData: VerifiedClientData[]) {
    if (!verifiedClientData || verifiedClientData.length === 0) return null;

    return verifiedClientData.reduce((prev, curr) =>
      parseInt(prev.initialAllowance) > parseInt(curr.initialAllowance)
        ? prev
        : curr,
    );
  }

  findGitHubIssueNumber(verifiedClientData: VerifiedClientData) {
    return parseInt(
      first(verifiedClientData?.allowanceArray)?.auditTrail?.split('/').pop(),
    );
  }
}
