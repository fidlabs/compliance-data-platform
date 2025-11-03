import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from 'src/db/prisma.service';
import { Cacheable } from 'src/utils/cacheable';
import { Retryable } from 'src/utils/retryable';
import { EthApiService } from '../eth-api/eth-api.service';
import {
  LotusStateLookupIdResponse,
  LotusStateMinerInfoResponse,
  LotusStateVerifiedClientStatusResponse,
} from './types.lotus-api';

@Injectable()
export class LotusApiService {
  private readonly logger = new Logger(LotusApiService.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly ethApiService: EthApiService,
  ) {}

  public async getFilecoinId(address: string): Promise<string | null> {
    // try to retrieve mapping from DB
    const addressMapping =
      await this.prismaService.id_address_mapping.findFirst({
        where: {
          address: address,
        },
      });

    if (addressMapping) return addressMapping.id;

    // if address not found in DB -> look up the glif API
    const endpoint = `${this.configService.get<string>('GLIF_API_BASE_URL')}/v1`;
    const { data } = await firstValueFrom(
      this.httpService.post<LotusStateLookupIdResponse>(endpoint, {
        jsonrpc: '2.0',
        method: 'Filecoin.StateLookupID',
        params: [address, []],
        id: 0,
      }),
    );

    if (data.error?.code === 3 || !data.result) return null;

    this.logger.debug(
      `Storing mapping for ID ${data.result} and address ${address}`,
    );

    // store result in DB
    await this.prismaService.id_address_mapping.upsert({
      where: {
        id: data.result,
      },
      update: {
        address: address,
      },
      create: {
        id: data.result,
        address: address,
      },
    });

    return data.result;
  }

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

    if (data.error || !data.result) return null;

    return BigInt(data.result);
  }
}
