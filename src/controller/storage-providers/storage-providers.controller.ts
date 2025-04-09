import { Controller, Get, Inject, Logger } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { StorageProviderService } from 'src/service/storage-provider/storage-provider.service';
import { StorageProviderWithIpInfo } from 'src/service/storage-provider/types.storage-provider';
import { Cache, CACHE_MANAGER, CacheTTL } from '@nestjs/cache-manager';

@Controller('storage-providers')
@CacheTTL(1000 * 60 * 30) // 30 minutes
export class StorageProvidersController {
  private readonly logger = new Logger(StorageProvidersController.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly storageProviderService: StorageProviderService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get list of storage providers with ip info',
  })
  @ApiOkResponse({
    description: 'List of storage providers',
    type: StorageProviderWithIpInfo,
    isArray: true,
  })
  public async getStorageProvidersWithIpInfo(): Promise<
    StorageProviderWithIpInfo[]
  > {
    return await this.storageProviderService.getStorageProvidersWithIpInfo();
  }
}
