import { Controller, Get } from '@nestjs/common';
import { ProviderService } from '../../../../service/provider/provider.service';
import { HistogramWeekResponseDto } from '../../../../types/histogramWeek.response.dto';
import { RetrievabilityWeekResponseDto } from '../../../../types/retrievabilityWeekResponse.dto';
import { ApiOkResponse } from '@nestjs/swagger';

@Controller('stats/acc/providers')
export class ProvidersAccController {
  constructor(private readonly providerAccService: ProviderService) {}

  @Get('clients')
  @ApiOkResponse({ type: HistogramWeekResponseDto })
  async getProviderClients(): Promise<HistogramWeekResponseDto> {
    return await this.providerAccService.getProviderClients(true);
  }

  @Get('biggest-client-distribution')
  @ApiOkResponse({ type: HistogramWeekResponseDto })
  async getProviderBiggestClientDistribution(): Promise<HistogramWeekResponseDto> {
    return await this.providerAccService.getProviderBiggestClientDistribution(
      true,
    );
  }

  @Get('retrievability')
  @ApiOkResponse({ type: RetrievabilityWeekResponseDto })
  async getProviderRetrievability(): Promise<RetrievabilityWeekResponseDto> {
    return await this.providerAccService.getProviderRetrievability(true);
  }
}
