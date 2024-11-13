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

@Injectable()
export class ProteusShieldService {
  private readonly logger = new Logger(ProteusShieldService.name);
  private readonly _minerInfoCacheKey = 'minerInfoCache';

  constructor(
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly prismaService: PrismaService,
  ) {}

  async getFilecoinClientId(address: string): Promise<string> {
    // try to retrieve mapping from DB
    const clientAddressMapping =
      await this.prismaService.client_address_mapping.findUnique({
        where: {
          address: address,
        },
      });
    if (clientAddressMapping) return clientAddressMapping.client;

    // if address not found in DB -> look up the glif API
    this.logger.log(`Getting Filecoin Id for address ${address}`);

    const { data } = await firstValueFrom(
      this.httpService
        .post<ProteusStateLookupIdResponse>(
          'https://api.calibration.node.glif.io',
          {
            jsonrpc: '2.0',
            method: 'Filecoin.StateLookupID',
            params: [address, []],
            id: 0,
          },
        )
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(error.response.data);
            throw error;
          }),
        ),
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
    const { data } = await firstValueFrom(
      this.httpService
        .post<ProteusStateMinerInfoResponse>(
          'https://api.node.glif.io/rpc/v0',
          {
            jsonrpc: '2.0',
            id: 1,
            method: 'Filecoin.StateMinerInfo',
            params: [provider, null],
          },
        )
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
