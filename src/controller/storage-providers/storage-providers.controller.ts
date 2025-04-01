import { Controller, Get, Logger } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { StorageProviderService } from 'src/service/storage-provider/storage-provider.service';
import { StorageProviderWithIpInfo } from 'src/service/storage-provider/types.storage-provider';

@Controller('storage-providers')
export class StorageProvidersController {
  private readonly logger = new Logger(StorageProvidersController.name);

  constructor(
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
  public async getStorageProvidersWithIpInfo() {
    return await this.storageProviderService.getStorageProvidersWithIpInfo();
  }
}
