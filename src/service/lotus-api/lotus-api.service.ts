import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  LotusStateLookupIdResponse,
  LotusStateMinerInfoResponse,
} from './types.lotus-api';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { PrismaService } from 'src/db/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Cacheable } from 'src/utils/cacheable';
import { Retryable } from 'src/utils/retryable';

@Injectable()
export class LotusApiService {
  private readonly logger = new Logger(LotusApiService.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  public async getFilecoinClientId(
    clientAddress: string,
  ): Promise<string | null> {
    // try to retrieve mapping from DB
    const clientAddressMapping =
      await this.prismaService.client_address_mapping.findFirst({
        where: {
          address: clientAddress,
        },
      });

    if (clientAddressMapping) return clientAddressMapping.client;

    // if address not found in DB -> look up the glif API
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

  @Cacheable({ ttl: 1000 * 60 * 60 * 12 }) // 12 hours
  public async getMinerInfo(
    providerId: string,
  ): Promise<LotusStateMinerInfoResponse> {
    try {
      return await this._getMinerInfo(providerId);
    } catch (err) {
      throw new Error(
        `Error fetching miner info for ${providerId}: ${err.message}`,
        { cause: err },
      );
    }
  }

  @Retryable({ retries: 2, delay: 5000 }) // 5 seconds
  private async _getMinerInfo(
    providerId: string,
  ): Promise<LotusStateMinerInfoResponse> {
    const endpoint = `${this.configService.get<string>('GLIF_API_BASE_URL')}/v1`;
    const { data } = await firstValueFrom(
      this.httpService.post<LotusStateMinerInfoResponse>(endpoint, {
        jsonrpc: '2.0',
        id: 1,
        method: 'Filecoin.StateMinerInfo',
        params: [providerId, null],
      }),
    );

    return data;
  }
}
