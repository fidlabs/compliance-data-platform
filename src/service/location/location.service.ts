import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolve4, resolve6 } from 'dns/promises';
import { Multiaddr } from 'multiaddr';
import { firstValueFrom } from 'rxjs';
import { Cacheable } from 'src/utils/cacheable';
import { Address, IPResponse } from './types.location';

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
      this.logger.warn(
        `Error getting location for ${multiAddrs}: ${err.message}`,
        // err.cause?.stack || err.stack,
      );

      return null;
    }
  }

  public extractAddressFromString(multiAddr: string): Address {
    return this.extractAddress(multiAddr);
  }

  public extractAddressFromBase64(multiAddr: string): Address {
    const multiAddrInstance = new Multiaddr(Buffer.from(multiAddr, 'base64'));
    return this.extractAddress(multiAddrInstance.toString());
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

  private extractAddress(multiAddr: string): Address {
    let finalMultiAddrToParse = multiAddr;

    // TODO temporary fix needed because multiaddr library does not support /dns/ prefix
    if (finalMultiAddrToParse.startsWith('/dns/')) {
      finalMultiAddrToParse = finalMultiAddrToParse.replace('/dns/', '/dns4/');
    }

    // TODO temporary fix needed because multiaddr library does not support /http-path/ and /ipni-provider/ sections - curio includes this in their multiaddrs
    if (
      finalMultiAddrToParse.includes('http-path') &&
      finalMultiAddrToParse.includes('ipni-provider')
    ) {
      // clean up the multiaddr to be parsable by multiaddr library
      // - decode %2F to /
      // - remove double // if exists (somehow appears in curio multiaddrs)
      // - remove /http-path/ and next after that /ipni-provider/ sections
      const decodedAddress = multiAddr.replaceAll('%2F', '/');
      const cleanedAddress = decodedAddress.replaceAll('//', '/');
      let newMultiAddrCurio = cleanedAddress.substring(
        0,
        cleanedAddress.indexOf('/http-path'),
      );

      // Add missing STANDARD parts of multiaddr to curio multiaddr - curio omits tcp/port before http/https
      if (newMultiAddrCurio.endsWith('https')) {
        newMultiAddrCurio = newMultiAddrCurio.replace('https', 'tcp/443/https');
      } else if (newMultiAddrCurio.endsWith('/http')) {
        newMultiAddrCurio = newMultiAddrCurio.replace('/http', 'tcp/80/http');
      }

      finalMultiAddrToParse = newMultiAddrCurio;
    }

    const multiaddrInstance = new Multiaddr(finalMultiAddrToParse);

    return {
      address: multiaddrInstance.nodeAddress().address,
      port: multiaddrInstance.nodeAddress().port,
      protocol: multiaddrInstance.protos()[0].name,
      isHttps: multiaddrInstance.protoNames().includes('https'),
    };
  }
}
