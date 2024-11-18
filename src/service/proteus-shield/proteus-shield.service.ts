import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ProteusStateLookupIdResponse,
  ProteusStateMinerInfoResponse,
} from './types.proteus-shield';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { HttpService } from '@nestjs/axios';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from '../../db/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProteusShieldService {
  private readonly logger = new Logger(ProteusShieldService.name);
  private readonly _minerInfoCacheKey = 'minerInfoCache';

  constructor(
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getFilecoinClientId(address: string): Promise<string> {
    // try to retrieve mapping from DB
    const clientAddressMapping =
      await this.prismaService.client_address_mapping.findFirst({
        where: {
          address: address,
        },
      });
    if (clientAddressMapping) return clientAddressMapping.client;

    // if address not found in DB -> look up the glif API
    this.logger.log(`Getting Filecoin Id for address ${address}`);

    const endpoint = `${this.configService.get<string>('GLIF_API_BASE_URL')}/v1`;
    const { data } = await firstValueFrom(
      this.httpService
        .post<ProteusStateLookupIdResponse>(endpoint, {
          jsonrpc: '2.0',
          method: 'Filecoin.StateLookupID',
          params: [address, []],
          id: 0,
        })
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(error.response.data);
            throw error;
          }),
        ),
    );

    if (data.error?.code === 3 || !data.result) return null;

    this.logger.debug(
      `Storing mapping for client ${data.result} and address ${address}`,
    );

    // store result in DB
    await this.prismaService.client_address_mapping.create({
      data: {
        client: data.result,
        address: address,
      },
    });

    return data.result;
  }

  async getMinerInfo(provider: string): Promise<ProteusStateMinerInfoResponse> {
    const cachedData =
      await this.cacheManager.get<ProteusStateMinerInfoResponse>(
        `${this._minerInfoCacheKey}_${provider}`,
      );
    if (cachedData) return cachedData;

    this.logger.log(`Getting miner info for ${provider}`);

    const endpoint = `${this.configService.get<string>('GLIF_API_BASE_URL')}/v1`;
    const { data } = await firstValueFrom(
      this.httpService
        .post<ProteusStateMinerInfoResponse>(endpoint, {
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
    await this.cacheManager.set(
      `${this._minerInfoCacheKey}_${provider}`,
      data,
      1000 * 60 * 60 * 2,
    );

    return data;
  }
}
