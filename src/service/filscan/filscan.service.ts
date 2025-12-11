import { Inject, Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Cacheable } from 'src/utils/cacheable';
import { FilscanAccountInfoByID } from './types.filscan';

@Injectable()
export class FilscanService {
  private readonly logger = new Logger(FilscanService.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {}

  @Cacheable({ ttl: 1000 * 60 * 60 }) // 1 hour
  public async getAccountInfoByID(
    addressId: string,
  ): Promise<FilscanAccountInfoByID> {
    const endpoint = `${this.configService.get<string>('FILSCAN_API_BASE_URL')}/v1/AccountInfoByID`;

    const { data } = await firstValueFrom(
      this.httpService.post<FilscanAccountInfoByID>(endpoint, {
        account_id: addressId,
      }),
    );

    if ((data?.['code'] && data?.['code'] !== 0) || !data?.['result']) {
      this.logger.warn(
        `Filscan API returned an error for AccountInfoByID with addressId ${addressId}: ${JSON.stringify(data)}`,
      );

      return null;
    }

    return data['result'];
  }
}
