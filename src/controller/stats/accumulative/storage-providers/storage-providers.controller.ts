import { Controller, Get } from '@nestjs/common';
import { StorageProviderService } from 'src/service/storage-provider/storage-provider.service';
import { ApiOkResponse } from '@nestjs/swagger';
import {
  HistogramWeekResponse,
  RetrievabilityWeekResponse,
} from 'src/service/histogram-helper/types.histogram-helper';
import { StorageProviderComplianceWeekResponse } from 'src/service/storage-provider/types.storage-provider';
import { CacheTTL } from '@nestjs/cache-manager';

@Controller('stats/acc/providers')
@CacheTTL(1000 * 60 * 60) // 1 hour
export class StorageProvidersAccController {
  constructor(
    private readonly storageProviderService: StorageProviderService,
  ) {}

  @Get('clients')
  @ApiOkResponse({ type: HistogramWeekResponse })
  async getProviderClients(): Promise<HistogramWeekResponse> {
    return await this.storageProviderService.getProviderClients(true);
  }

  @Get('biggest-client-distribution')
  @ApiOkResponse({ type: HistogramWeekResponse })
  async getProviderBiggestClientDistribution(): Promise<HistogramWeekResponse> {
    return await this.storageProviderService.getProviderBiggestClientDistribution(
      true,
    );
  }

  @Get('retrievability')
  @ApiOkResponse({ type: RetrievabilityWeekResponse })
  async getProviderRetrievability(): Promise<RetrievabilityWeekResponse> {
    return await this.storageProviderService.getProviderRetrievability(true);
  }

  @Get('compliance-data')
  @ApiOkResponse({ type: StorageProviderComplianceWeekResponse })
  async getProviderCompliance(): Promise<StorageProviderComplianceWeekResponse> {
    return await this.storageProviderService.getProviderCompliance(true);
  }
}
