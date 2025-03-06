import { Inject, Injectable, Logger } from '@nestjs/common';
import { resolve4, resolve6 } from 'dns/promises';
import { Multiaddr } from 'multiaddr';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Address, IPResponse } from './types.location';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Cacheable } from 'src/utils/cacheable';

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(
    private configService: ConfigService,
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  public async getLocation(multiAddrs?: string[]): Promise<IPResponse | null> {
    if (!multiAddrs) return null;

    try {
      return await this._getLocation(multiAddrs);
    } catch (err) {
      throw new Error(
        `Error getting location for ${multiAddrs}: ${err.message}`,
        { cause: err },
      );
    }
  }

  public extractAddressFromString(multiAddr: string): Address {
    return this.extractAddress(new Multiaddr(multiAddr));
  }

  public extractAddressFromBase64(multiAddr: string): Address {
    return this.extractAddress(new Multiaddr(Buffer.from(multiAddr, 'base64')));
  }

  @Cacheable({ ttl: 1000 * 60 * 60 * 12 }) // 12 hours
  public async resolveAddress(address: Address): Promise<string> {
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

    return result[0];
  }

  // returns the location of the first non-bogon IP
  private async _getLocation(multiAddrs: string[]): Promise<IPResponse | null> {
    const ips: string[] = [];

    for (const multiaddr of multiAddrs) {
      ips.push(
        await this.resolveAddress(this.extractAddressFromBase64(multiaddr)),
      );
    }

    return await this.getLocationDetails(ips);
  }

  @Cacheable({ ttl: 1000 * 60 * 60 * 12 }) // 12 hours
  private async _getLocationDetails(ip: string): Promise<IPResponse | null> {
    const ipInfoToken = this.configService.get<string>('IP_INFO_TOKEN');

    const { data } = await firstValueFrom(
      this.httpService.get<IPResponse>(
        `https://ipinfo.io/${ip}?token=${ipInfoToken}`,
      ),
    );

    return data;
  }

  // returns the first non-bogon IP response
  private async getLocationDetails(ips: string[]): Promise<IPResponse | null> {
    for (const ip of ips) {
      const data = await this._getLocationDetails(ip);
      if (data.bogon === true) continue;

      return data;
    }

    return null;
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
