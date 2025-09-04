import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class UrlFinderApiService {
  private readonly logger = new Logger(UrlFinderApiService.name);
  private readonly URL_FINDER_API_URL: string;

  constructor(
    private configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.URL_FINDER_API_URL =
      this.configService.get<string>('URL_FINDER_API_URL');
  }

  public async fetchRetrievability(
    storageProviderId: string,
    clientId?: string,
  ) {
    const endpoint = `${this.URL_FINDER_API_URL}/url/retrievability/${storageProviderId}${clientId ? `/${clientId}` : ''}`;

    const { data } = await lastValueFrom(
      this.httpService.get(endpoint, { timeout: 90000 }), // 90 seconds
    );

    return data;
  }

  public async fetchPieceWorkingUrlForClientProvider(
    clientId: string,
    storageProviderId: string,
  ): Promise<string | null> {
    const endpoint = `${this.URL_FINDER_API_URL}/url/find/${storageProviderId}/${clientId}`;

    const { data } = await lastValueFrom(
      this.httpService.get<{ result: string; url: string }>(endpoint, {
        timeout: 5000,
      }), // 5 seconds
    );

    if (data.result !== 'Success') {
      this.logger.warn(
        `No piece working URL found for client ${clientId} and provider ${storageProviderId}`,
      );

      return null;
    }

    return data.url;
  }
}
