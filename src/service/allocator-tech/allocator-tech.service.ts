import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { HttpService } from '@nestjs/axios';
import { AllocatorTechApplicationsResponse } from './types.allocator-tech';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class AllocatorTechService {
  private readonly _applicationsCacheKey = 'allocatorTechCache';
  private readonly logger = new Logger(AllocatorTechService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async getApplications(): Promise<AllocatorTechApplicationsResponse[]> {
    const cachedApplications = await this.cacheManager.get<
      AllocatorTechApplicationsResponse[]
    >(this._applicationsCacheKey);
    if (cachedApplications) return cachedApplications;

    return await this.fetchAndCacheApplications();
  }

  private async fetchAndCacheApplications(): Promise<
    AllocatorTechApplicationsResponse[]
  > {
    const endpoint = `${this.configService.get<string>('ALLOCATOR_TECH_BASE_URL')}/applications`;
    const { data } = await firstValueFrom(
      this.httpService.get<AllocatorTechApplicationsResponse[]>(endpoint).pipe(
        catchError((error: AxiosError) => {
          this.logger.error(error.response.data);
          throw error;
        }),
      ),
    );

    // cache
    await this.cacheManager.set(
      this._applicationsCacheKey,
      data,
      60 * 60 * 1000,
    );

    return data;
  }
}
