import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Cacheable } from 'src/utils/cacheable';
import { Retryable } from 'src/utils/retryable';
import { EthApiService } from '../eth-api/eth-api.service';
import {
  LotusStateMinerInfoResponse,
  LotusStateVerifiedClientStatusResponse,
} from './types.lotus-api';

@Injectable()
export class LotusApiService {
  private readonly logger = new Logger(LotusApiService.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly ethApiService: EthApiService,
  ) {}

  @Cacheable({ ttl: 1000 * 60 * 60 * 12 }) // 12 hours
  public async getMinerInfo(
    storageProviderId: string,
  ): Promise<LotusStateMinerInfoResponse> {
    try {
      return await this._getMinerInfo(storageProviderId);
    } catch (err) {
      throw new Error(
        `Error fetching miner info for ${storageProviderId}: ${err.message}`,
        { cause: err },
      );
    }
  }

  @Retryable({ retries: 3, delay: 5000 }) // 5 seconds
  private async _getMinerInfo(
    storageProviderId: string,
  ): Promise<LotusStateMinerInfoResponse> {
    const mappedCurioPeerId =
      await this.ethApiService.checkAndMapCurioStorageProviderPeerId(
        storageProviderId,
      );

    const endpoint = `${this.configService.get<string>('GLIF_API_BASE_URL')}/v1`;

    const { data } = await firstValueFrom(
      this.httpService.post<LotusStateMinerInfoResponse>(endpoint, {
        jsonrpc: '2.0',
        id: 1,
        method: 'Filecoin.StateMinerInfo',
        params: [storageProviderId, null],
      }),
    );

    if (!data?.result) throw new Error(`No data`);

    return {
      ...data,
      result: {
        ...data.result,
        PeerId: mappedCurioPeerId ?? data.result.PeerId,
      },
    };
  }

  public async getClientDatacap(clientId: string): Promise<bigint | null> {
    const endpoint = `${this.configService.get<string>('GLIF_API_BASE_URL')}/v1`;

    const { data } = await firstValueFrom(
      this.httpService.post<LotusStateVerifiedClientStatusResponse>(endpoint, {
        jsonrpc: '2.0',
        method: 'Filecoin.StateVerifiedClientStatus',
        params: [clientId, []],
        id: 0,
      }),
    );

    if (data.error || !data.result) {
      this.logger.warn(
        `Glif API returned an error for StateVerifiedClientStatus with clientId ${clientId}: ${JSON.stringify(data)}`,
      );

      return null;
    }

    return BigInt(data.result);
  }
}
