import { Inject, Injectable, Logger } from '@nestjs/common';
import { ProteusResponse } from './types.proteus-shield';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { HttpService } from '@nestjs/axios';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class ProteusShieldService {
  private readonly logger = new Logger(ProteusShieldService.name);
  private readonly _minerInfoCacheKey = 'minerInfoCache';

  constructor(
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async getMinerInfo(provider: string): Promise<ProteusResponse> {
    const cachedData = await this.cacheManager.get<ProteusResponse>(
      `${this._minerInfoCacheKey}_${provider}`,
    );
    if (cachedData) return cachedData;

    this.logger.log(`Getting miner info for ${provider}`);
    const { data } = await firstValueFrom(
      this.httpService
        .post<ProteusResponse>('https://api.node.glif.io/rpc/v0', {
          jsonrpc: '2.0',
          id: 1,
          method: 'Filecoin.StateMinerInfo',
          params: [provider, null],
        })
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(error.response.data);
            throw error;
          }),
        ),
    );
    await this.cacheManager.set(`${this._minerInfoCacheKey}_${provider}`, data);

    return data;
  }
}
