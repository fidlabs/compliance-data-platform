import { Controller, Get } from '@nestjs/common';
import { ProviderService } from '../../../service/provider/provider.service';
import { HistogramWeekResponseDto } from '../../../types/histogramWeek.response.dto';
import { RetrievabilityWeekResponseDto } from '../../../types/retrievabilityWeekResponse.dto';
import { ApiOkResponse } from '@nestjs/swagger';

@Controller('stats/providers')
export class ProvidersController {
  constructor(private readonly providerService: ProviderService) {}

  @Get('clients')
  @ApiOkResponse({ type: HistogramWeekResponseDto })
  async getProviderClients(): Promise<HistogramWeekResponseDto> {
    return await this.providerService.getProviderClients(false);
  }

  @Get('biggest-client-distribution')
  @ApiOkResponse({ type: HistogramWeekResponseDto })
  async getProviderBiggestClientDistribution(): Promise<HistogramWeekResponseDto> {
    return await this.providerService.getProviderBiggestClientDistribution(
      false,
    );
  }

  @Get('retrievability')
  @ApiOkResponse({ type: RetrievabilityWeekResponseDto })
  async getProviderRetrievability(): Promise<RetrievabilityWeekResponseDto> {
    return await this.providerService.getProviderRetrievability(false);
  }
}
