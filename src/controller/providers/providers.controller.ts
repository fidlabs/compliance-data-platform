import { Controller, Get, Logger } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { StorageProviderService } from 'src/service/storage-provider/storage-provider.service';
import { StorageProviderWithIpInfo } from 'src/service/storage-provider/types.storage-provider';

@Controller('providers')
export class ProvidersController {
  private readonly logger = new Logger(ProvidersController.name);

  constructor(
    private readonly storageProviderService: StorageProviderService,
  ) {}

  @Get('')
  @ApiOperation({
    summary: 'Get list of providers with ip info',
  })
  @ApiOkResponse({
    description: 'List of providers',
    type: StorageProviderWithIpInfo,
    isArray: true,
  })
  public async getStorageProvidersWithIpInfo() {
    return await this.storageProviderService.getStorageProvidersWithIpInfo();
  }
}
