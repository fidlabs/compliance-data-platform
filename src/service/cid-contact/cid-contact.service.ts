import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { AxiosRequestConfig } from 'axios';
import { decodeAllSync } from 'cbor';
import { Multiaddr } from 'multiaddr';
import { lastValueFrom } from 'rxjs';
import { Address } from '../location/types.location';
import { IPNIAdvertisement, IPNIProvider } from './types.cid-contact';

const base64Regex =
  /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;

@Injectable()
export class CidContactService {
  private readonly logger = new Logger(CidContactService.name);

  constructor(private readonly httpService: HttpService) {}

  public async getIPNIProviders(): Promise<IPNIProvider[]> {
    const endpoint = 'https://cid.contact/providers';
    const { data } = await lastValueFrom(this.httpService.get(endpoint));
    return data;
  }

  public async getIPNIPublisherAdvertisement(
    baseUrl: string,
    advertisementId?: string,
  ): Promise<IPNIAdvertisement | null> {
    try {
      return await this._getIPNIPublisherAdvertisement(
        baseUrl,
        advertisementId,
      );
    } catch (err) {
      throw new Error(`Error fetching IPNI advertisement: ${err.message}`, {
        cause: err,
      });
    }
  }

  private async _getIPNIPublisherAdvertisement(
    baseUrl: string,
    advertisementId?: string,
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
    try {
      return await this._getIPNIPublisherAdvertisementEntriesNumber(
        baseUrl,
        advertisement,
      );
    } catch (err) {
      throw new Error(
        `Error fetching IPNI advertisement entries: ${err.message}`,
        { cause: err },
      );
    }
  }

  private async _getIPNIPublisherAdvertisementEntriesNumber(
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
    let entriesCount = 0;

    const isCurioBaseUrl = baseUrl.includes('/ipni-provider/');
    const requestConfig: AxiosRequestConfig = isCurioBaseUrl
      ? { responseType: 'arraybuffer' }
      : undefined;

    do {
      let nextEntriesData = undefined;

      const { data } = await lastValueFrom(
        this.httpService.get(endpoint, requestConfig),
      );

      if (isCurioBaseUrl) {
        const decodedCborCurio = decodeAllSync(data); // decode as CBOR

        entriesCount += decodedCborCurio[0]?.Entries?.length;
        nextEntriesData = decodedCborCurio[0]?.Next?.['/'];
      } else {
        entriesCount += Object.keys(data['Entries']).length;
        nextEntriesData = data?.Next?.['/'];
      }

      endpoint = nextEntriesData
        ? `${baseUrl}/ipni/v1/ad/${nextEntriesData}`
        : null;
    } while (endpoint);

    return entriesCount;
  }

  public extractMultiaddrAndBuildPublisherBaseUrl(publisherAddress: string): {
    multiaddrString: string;
    publisherBaseUrl: string;
    multiaddr: Address;
  } {
    let finalMultiAddrToParse = publisherAddress;

    // check if the publisher address is base64 encoded. byte64 comes from StateMinerInfo in lotus api
    if (base64Regex.test(publisherAddress)) {
      finalMultiAddrToParse = Buffer.from(
        publisherAddress,
        'base64',
      ).toString();
    }

    console.log('finalMultiAddrToParse:', finalMultiAddrToParse);
    let curioSuffix = '';

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
      const decodedAddress = finalMultiAddrToParse.replaceAll('%2F', '/');
      const cleanedAddress = decodedAddress.replaceAll('//', '/');

      // - remove /http-path/ and next after that /ipni-provider/ sections
      let newMultiAddrCurio = cleanedAddress.substring(
        0,
        cleanedAddress.indexOf('/http-path'),
      );

      // build final base publisher url
      curioSuffix = cleanedAddress.substring(
        cleanedAddress.indexOf('/ipni-provider/'),
        cleanedAddress.length,
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

    const publisherAddressInstance: Address = {
      address: multiaddrInstance.nodeAddress().address,
      port: multiaddrInstance.nodeAddress().port,
      protocol: multiaddrInstance.protos()[0].name,
      isHttps: multiaddrInstance.protoNames().includes('https'),
    };

    const publisherUrl = publisherAddressInstance.port
      ? `${publisherAddressInstance.address}:${publisherAddressInstance.port}`
      : publisherAddressInstance.address;

    return {
      multiaddr: publisherAddressInstance,
      multiaddrString: finalMultiAddrToParse,
      publisherBaseUrl: `${publisherAddressInstance.isHttps ? 'https' : 'http'}://${publisherUrl}${curioSuffix}`,
    };
  }
}
