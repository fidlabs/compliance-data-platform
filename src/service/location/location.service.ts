import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolve4, resolve6 } from 'dns/promises';
import { firstValueFrom } from 'rxjs';
import { Cacheable } from 'src/utils/cacheable';
import { CidContactService } from '../cid-contact/cid-contact.service';
import { Address, IPResponse } from './types.location';

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(
    private configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly cidContactService: CidContactService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  public async getLocation(multiAddrs?: string[]): Promise<IPResponse | null> {
    if (!multiAddrs) return null;

    try {
      return await this._getLocation(multiAddrs);
    } catch (err) {
      this.logger.warn(
        `Error getting location for ${multiAddrs}: ${err.message}`,
        // err.cause?.stack || err.stack,
      );

      return null;
    }
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
      const parsedMultiaddr =
        this.cidContactService.extractMultiaddrAndBuildPublisherBaseUrl(
          multiaddr,
        );

      if (!parsedMultiaddr.multiaddr) continue;

      ips.push(await this.resolveAddress(parsedMultiaddr.multiaddr));
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
}
