import { Inject, Injectable, Logger } from '@nestjs/common';
import { resolve4, resolve6 } from 'dns/promises';
import { Multiaddr } from 'multiaddr';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Address, IPResponse } from './types.location';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class LocationService {
  private readonly _resolveAddressCacheKey = 'resolveAddressCache';
  private readonly _locationDetailsCacheKey = 'locationDetailsCache';
  private readonly logger = new Logger(LocationService.name);

  constructor(
    private configService: ConfigService,
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async getLocation(multiAddrs?: string[] | null): Promise<IPResponse | null> {
    if (!multiAddrs) return null;

    try {
      return await this._getLocation(multiAddrs);
    } catch (err) {
      this.logger.error(
        `Error getting location for ${multiAddrs}: ${err}`,
        err.stack,
      );
      throw err;
    }
  }

  extractAddressFromString(multiAddr: string): Address {
    return this.extractAddress(new Multiaddr(multiAddr));
  }

  extractAddressFromBase64(multiAddr: string): Address {
    return this.extractAddress(new Multiaddr(Buffer.from(multiAddr, 'base64')));
  }

  async resolveAddress(address: Address): Promise<string> {
    const cacheKey = this.getCacheKey(
      this._resolveAddressCacheKey,
      JSON.stringify(address),
    );
    const cachedData = await this.cacheManager.get<string>(cacheKey);
    if (cachedData) return cachedData;

    let result: string[];

    switch (address.protocol) {
      case 'dns4':
        result = await resolve4(address.address);
        break;
      case 'dns6':
        result = await resolve6(address.address);
        break;
      case 'ip4':
      case 'ip6':
        result = [address.address];
        break;
      default:
        this.logger.error(`Unknown address / protocol: ${address}`);
        result = [];
    }

    await this.cacheManager.set(cacheKey, result[0], 1000 * 60 * 60 * 24); // 24 hours
    return result[0];
  }

  async resolveAddressWithPort(address: Address): Promise<string> {
    const resolvedAddress = await this.resolveAddress(address);

    return address.port
      ? `${resolvedAddress}:${address.port}`
      : resolvedAddress;
  }

  private async _getLocation(multiAddrs: string[]): Promise<IPResponse | null> {
    const ips: string[] = [];

    for (const multiaddr of multiAddrs) {
      ips.push(
        await this.resolveAddress(this.extractAddressFromBase64(multiaddr)),
      );
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
        this.httpService.get<IPResponse>(
          `https://ipinfo.io/${ip}?token=${ipInfoToken}`,
        ),
      );

      if (data.bogon === true) continue;
      await this.cacheManager.set(cacheKey, data, 1000 * 60 * 60 * 24); // 24 hours

      return data;
    }

    return null;
  }

  private getCacheKey(cacheNameKey: string, key: string): string {
    return `${cacheNameKey}_${key}`;
  }

  private extractAddress(multiaddrInstance: Multiaddr): Address {
    // TODO: temporary fix needed because multiaddr library does not support /dns/ prefix
    if (multiaddrInstance.toString().startsWith('/dns/')) {
      multiaddrInstance = new Multiaddr(
        multiaddrInstance.toString().replace('/dns/', '/dns4/'),
      );
    }

    return {
      address: multiaddrInstance.nodeAddress().address,
      port: multiaddrInstance.nodeAddress().port,
      protocol: multiaddrInstance.protos()[0].name,
    };
  }
}
