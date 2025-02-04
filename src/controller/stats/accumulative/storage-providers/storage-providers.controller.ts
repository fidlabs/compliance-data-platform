import { Controller, Get } from '@nestjs/common';
import { StorageProviderService } from '../../../../service/storage-provider/storage-provider.service';
import { HistogramWeekResponseDto } from '../../../../types/histogramWeek.response.dto';
import { RetrievabilityWeekResponseDto } from '../../../../types/retrievabilityWeekResponse.dto';
import { ApiOkResponse } from '@nestjs/swagger';

@Controller('stats/acc/providers')
export class StorageProvidersAccController {
  constructor(
    private readonly storageProviderService: StorageProviderService,
  ) {}

  @Get('clients')
  @ApiOkResponse({ type: HistogramWeekResponseDto })
  async getProviderClients(): Promise<HistogramWeekResponseDto> {
    return await this.storageProviderService.getProviderClients(true);
  }

  @Get('biggest-client-distribution')
  @ApiOkResponse({ type: HistogramWeekResponseDto })
  async getProviderBiggestClientDistribution(): Promise<HistogramWeekResponseDto> {
    return await this.storageProviderService.getProviderBiggestClientDistribution(
      true,
    );
  }

  @Get('retrievability')
  @ApiOkResponse({ type: RetrievabilityWeekResponseDto })
  async getProviderRetrievability(): Promise<RetrievabilityWeekResponseDto> {
    return await this.storageProviderService.getProviderRetrievability(true);
  }
}
