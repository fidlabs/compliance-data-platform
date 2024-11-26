import { Inject, Injectable, Logger } from '@nestjs/common';
import { resolve4, resolve6 } from 'dns/promises';
import { Multiaddr } from 'multiaddr';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { IPResponse } from './types.location';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class LocationService {
  private readonly _ipFromMultiaddrCacheKey = 'ipFromMultiaddrCache';
  private readonly _locationDetailsCacheKey = 'locationDetailsCache';
  private readonly logger = new Logger(LocationService.name);

  constructor(
    private configService: ConfigService,
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async getLocation(multiAddrs: string[]): Promise<IPResponse | null> {
    const ips: string[] = [];
    for (const multiaddr of multiAddrs) {
      ips.push(...(await this.getIpFromMultiaddr(multiaddr)));
    }

    return await this.getLocationDetails(ips);
  }

  private async getLocationDetails(ips: string[]): Promise<IPResponse | null> {
    const ipInfoToken = this.configService.get<string>('IP_INFO_TOKEN');

    for (const ip of ips) {
      const cacheKey = this.getCacheKey(this._locationDetailsCacheKey, ip);
      const cachedData = await this.cacheManager.get<IPResponse>(cacheKey);
      if (cachedData) return cachedData;

      const { data } = await firstValueFrom(
        this.httpService
          .get<IPResponse>(`https://ipinfo.io/${ip}?token=${ipInfoToken}`)
          .pipe(
            catchError((error: AxiosError) => {
              throw error;
            }),
          ),
      );

      if (data.bogon === true) continue;
      await this.cacheManager.set(cacheKey, data, 1000 * 60 * 60 * 24);

      return data;
    }
    return null;
  }

  private async getIpFromMultiaddr(multiAddr: string): Promise<string[]> {
    const cacheKey = this.getCacheKey(this._ipFromMultiaddrCacheKey, multiAddr);
    const cachedData = await this.cacheManager.get<string[]>(cacheKey);
    if (cachedData) return cachedData;

    const { address, protocol } = this.extractAddressAndProtocol(multiAddr);

    const result = await this.resolveIpAddress(address, protocol);

    await this.cacheManager.set(cacheKey, result, 1000 * 60 * 60 * 24);
    return result;
  }

  private getCacheKey(cacheNameKey: string, key: string): string {
    return `${cacheNameKey}_${key}`;
  }

  private extractAddressAndProtocol(multiAddr: string): {
    address: string;
    protocol: string;
  } {
    const multiaddrInstance = new Multiaddr(Buffer.from(multiAddr, 'base64'));
    return {
      address: multiaddrInstance.nodeAddress().address,
      protocol: multiaddrInstance.protos()[0].name,
    };
  }

  private async resolveIpAddress(
    address: string,
    protocol: string,
  ): Promise<string[]> {
    let result: string[];
    switch (protocol) {
      case 'dns4':
        result = await resolve4(address);
        break;
      case 'dns6':
        result = await resolve6(address);
        break;
      case 'ip4':
      case 'ip6':
        result = [address];
        break;
      default:
        this.logger.error({ address, protocol }, 'Unknown protocol');
        result = [];
    }
    return result;
  }
}
