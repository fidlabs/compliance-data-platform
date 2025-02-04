import { Controller, Get } from '@nestjs/common';
import { StorageProviderService } from 'src/service/storage-provider/storage-provider.service';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { AggregatedProvidersIPNIReportingStatus } from 'src/service/ipni-misreporting-checker/types.ipni-misreporting-checker';
import { IpniMisreportingCheckerService } from 'src/service/ipni-misreporting-checker/ipni-misreporting-checker.service';
import {
  HistogramWeekResponse,
  RetrievabilityWeekResponse,
} from 'src/service/histogram-helper/types.histogram-helper';

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
  @ApiOkResponse({ type: HistogramWeekResponse })
  async getProviderClients(): Promise<HistogramWeekResponse> {
    return await this.storageProviderService.getProviderClients(false);
  }

  @Get('biggest-client-distribution')
  @ApiOkResponse({ type: HistogramWeekResponse })
  async getProviderBiggestClientDistribution(): Promise<HistogramWeekResponse> {
    return await this.storageProviderService.getProviderBiggestClientDistribution(
      false,
    );
  }

  @Get('retrievability')
  @ApiOkResponse({ type: RetrievabilityWeekResponse })
  async getProviderRetrievability(): Promise<RetrievabilityWeekResponse> {
    return await this.storageProviderService.getProviderRetrievability(false);
  }
}
