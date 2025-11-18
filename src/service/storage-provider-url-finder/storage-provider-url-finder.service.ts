import { HttpService } from '@nestjs/axios';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { SliStorageProviderUrlFinder } from './types.storage-provider-url-finder.service';
import { PrismaService } from 'src/db/prisma.service';

@Injectable()
export class StorageProviderUrlFinderService {
  private readonly logger = new Logger(StorageProviderUrlFinderService.name);
  private readonly URL_FINDER_API_URL: string;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly httpService: HttpService,
    private configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    this.URL_FINDER_API_URL =
      this.configService.get<string>('URL_FINDER_API_URL');
  }

  public async fetchLastSlisForAllProviders(): Promise<
    SliStorageProviderUrlFinder[]
  > {
    const endpoint = `${this.URL_FINDER_API_URL}/slis`;

    const { data } = await lastValueFrom(
      this.httpService.get<SliStorageProviderUrlFinder[]>(endpoint),
    );

    return data;
  }

  public async fetchLastSlisForProvider(
    storageProviderId: string,
    clientId?: string,
  ): Promise<SliStorageProviderUrlFinder> {
    const endpoint = `${this.URL_FINDER_API_URL}/slis/find/${storageProviderId}${clientId ? `/${clientId}` : ''}`;

    const { data } = await lastValueFrom(
      this.httpService.get<SliStorageProviderUrlFinder>(endpoint),
    );

    return data;
  }

  public async fetchHistoricalSlisForProvider(
    storageProviderId: string,
    clientId?: string,
    options?: { from: string; to: string },
  ): Promise<SliStorageProviderUrlFinder[]> {
    const endpoint = `${this.URL_FINDER_API_URL}/slis/find/${storageProviderId}${clientId ? `/${clientId}` : ''} ${options ? `?from=${options.from}&to=${options.to}` : ''}`;

    const { data } = await lastValueFrom(
      this.httpService.get<SliStorageProviderUrlFinder[]>(endpoint),
    );

    return data;
  }

  public async storeSliForProvider(
    data: SliStorageProviderUrlFinder,
  ): Promise<void> {
    await this.prismaService.storage_provider_sli.create({
      data: {
        providerId: data.providerId,
        working_url: data.working_url,
        retrievability_percent: data.retrievability_percent,

        tested_at: new Date(data.tested_at),
      },
    });
  }
}
