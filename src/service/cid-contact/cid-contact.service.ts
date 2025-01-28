import { Inject, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { LocationService } from '../location/location.service';
import { IPNIAdvertisement, IPNIProvider } from './types.cid-contact';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CidContactService {
  private readonly logger = new Logger(CidContactService.name);
  constructor(
    private readonly httpService: HttpService,
    private readonly locationService: LocationService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  public async getIPNIProviders(): Promise<IPNIProvider[]> {
    const cachedProviders =
      await this.cacheManager.get<IPNIProvider[]>('ipniProviders');

    if (cachedProviders) return cachedProviders;

    const endpoint = 'https://cid.contact/providers';
    const { data } = await lastValueFrom(this.httpService.get(endpoint));

    await this.cacheManager.set('ipniProviders', data, 1000 * 60 * 60); // 1 hour
    return data;
  }

  public async getIPNIPublisherBaseUrl(
    ipniProvider: IPNIProvider,
  ): Promise<string> {
    const publisherAddress = this.locationService.extractAddressFromString(
      ipniProvider.Publisher.Addrs[0],
    );

    const publisherUrl = publisherAddress.port
      ? `${publisherAddress.address}:${publisherAddress.port}`
      : publisherAddress.address;

    return `http://${publisherUrl}`;
  }

  public async getIPNIPublisherAdvertisement(
    baseUrl: string,
    advertisementId?: string | null,
  ): Promise<IPNIAdvertisement | null> {
    try {
      return await this._getIPNIPublisherAdvertisement(
        baseUrl,
        advertisementId,
      );
    } catch (err) {
      throw new Error(`Error fetching IPNI advertisement: ${err}`);
    }
  }

  private async _getIPNIPublisherAdvertisement(
    baseUrl: string,
    advertisementId?: string | null,
  ): Promise<IPNIAdvertisement | null> {
    if (!advertisementId) return null;

    const endpoint = `${baseUrl}/ipni/v1/ad/${advertisementId}`;

    const { data } = await lastValueFrom(this.httpService.get(endpoint));

    return { ...data, ID: advertisementId };
  }

  public async getIPNIPublisherAdvertisementEntriesNumber(
    baseUrl: string,
    advertisement: IPNIAdvertisement,
  ): Promise<number> {
    const entries = advertisement.Entries['/'];

    if (entries.startsWith('bafk')) {
      if (entries === 'bafkreehdwdcefgh4dqkjv67uzcmw7oje') {
        // hash for empty array
        return 0;
      } else {
        this.logger.error(
          `getIPNIPublisherAdvertisementEntries: unknown bafk entries ID: ${entries}`,
        );
      }
    }

    let endpoint = `${baseUrl}/ipni/v1/ad/${entries}`;
    let result = 0;

    do {
      const { data } = await lastValueFrom(this.httpService.get(endpoint));
      result += Object.keys(data['Entries']).length;

      endpoint = data['Next']?.['/']
        ? `${baseUrl}/ipni/v1/ad/${data['Next']['/']}`
        : null;
    } while (endpoint);

    return result;
  }
}
