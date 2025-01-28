import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  LotusStateLookupIdResponse,
  LotusStateMinerInfoResponse,
} from './types.lotus-api';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from '../../db/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LotusApiService {
  private readonly logger = new Logger(LotusApiService.name);
  private readonly _minerInfoCacheKey = 'minerInfoCache';

  constructor(
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getFilecoinClientId(clientAddress: string): Promise<string> {
    // try to retrieve mapping from DB
    const clientAddressMapping =
      await this.prismaService.client_address_mapping.findFirst({
        where: {
          address: clientAddress,
        },
      });

    if (clientAddressMapping) return clientAddressMapping.client;

    // if address not found in DB -> look up the glif API
    this.logger.log(`Getting Filecoin Id for client address ${clientAddress}`);

    const endpoint = `${this.configService.get<string>('GLIF_API_BASE_URL')}/v1`;
    const { data } = await firstValueFrom(
      this.httpService.post<LotusStateLookupIdResponse>(endpoint, {
        jsonrpc: '2.0',
        method: 'Filecoin.StateLookupID',
        params: [clientAddress, []],
        id: 0,
      }),
    );

    if (data.error?.code === 3 || !data.result) return null;

    this.logger.debug(
      `Storing mapping for client ID ${data.result} and address ${clientAddress}`,
    );

    // store result in DB
    await this.prismaService.client_address_mapping.create({
      data: {
        client: data.result,
        address: clientAddress,
      },
    });

    return data.result;
  }

  async getMinerInfo(
    providerId: string,
    retries: number = 1,
  ): Promise<LotusStateMinerInfoResponse> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this._getMinerInfo(providerId);
      } catch (err) {
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 seconds
        } else {
          throw err;
        }
      }
    }
  }

  private async _getMinerInfo(
    providerId: string,
  ): Promise<LotusStateMinerInfoResponse> {
    const cachedData = await this.cacheManager.get<LotusStateMinerInfoResponse>(
      `${this._minerInfoCacheKey}_${providerId}`,
    );
    if (cachedData) return cachedData;

    this.logger.debug(`Getting miner info for ${providerId}`);

    const endpoint = `${this.configService.get<string>('GLIF_API_BASE_URL')}/v1`;
    const { data } = await firstValueFrom(
      this.httpService.post<LotusStateMinerInfoResponse>(endpoint, {
        jsonrpc: '2.0',
        id: 1,
        method: 'Filecoin.StateMinerInfo',
        params: [providerId, null],
      }),
    );

    await this.cacheManager.set(
      `${this._minerInfoCacheKey}_${providerId}`,
      data,
      1000 * 60 * 60 * 2, // 2 hours
    );

    return data;
  }
}
