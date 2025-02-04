import { Controller, Get } from '@nestjs/common';
import { StorageProviderService } from '../../../service/storage-provider/storage-provider.service';
import { HistogramWeekResponseDto } from '../../../types/histogramWeek.response.dto';
import { RetrievabilityWeekResponseDto } from '../../../types/retrievabilityWeekResponse.dto';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { AggregatedProvidersIPNIReportingStatus } from '../../../service/ipni-misreporting-checker/types.ipni-misreporting-checker';
import { IpniMisreportingCheckerService } from '../../../service/ipni-misreporting-checker/ipni-misreporting-checker.service';

@Controller('stats/providers')
export class StorageProvidersController {
  constructor(
    private readonly storageProviderService: StorageProviderService,
    private readonly ipniMisreportingCheckerService: IpniMisreportingCheckerService,
  ) {}

  @Get('/aggregated-ipni-status')
  @ApiOperation({
    summary: 'Get aggregated storage providers IPNI reporting status',
  })
  @ApiOkResponse({
    description: 'Aggregated storage providers IPNI reporting status',
    type: AggregatedProvidersIPNIReportingStatus,
  })
  async getAggregatedProvidersIPNIReportingStatus(): Promise<AggregatedProvidersIPNIReportingStatus> {
    return await this.ipniMisreportingCheckerService.getAggregatedProvidersReportingStatus();
  }

  @Get('clients')
  @ApiOkResponse({ type: HistogramWeekResponseDto })
  async getProviderClients(): Promise<HistogramWeekResponseDto> {
    return await this.storageProviderService.getProviderClients(false);
  }

  @Get('biggest-client-distribution')
  @ApiOkResponse({ type: HistogramWeekResponseDto })
  async getProviderBiggestClientDistribution(): Promise<HistogramWeekResponseDto> {
    return await this.storageProviderService.getProviderBiggestClientDistribution(
      false,
    );
  }

  @Get('retrievability')
  @ApiOkResponse({ type: RetrievabilityWeekResponseDto })
  async getProviderRetrievability(): Promise<RetrievabilityWeekResponseDto> {
    return await this.storageProviderService.getProviderRetrievability(false);
  }
}
