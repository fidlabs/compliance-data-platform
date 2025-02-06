import { Controller, Get } from '@nestjs/common';
import { StorageProviderService } from 'src/service/storage-provider/storage-provider.service';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { AggregatedProvidersIPNIReportingStatus } from 'src/service/ipni-misreporting-checker/types.ipni-misreporting-checker';
import {
  HistogramWeekResponse,
  RetrievabilityWeekResponse,
} from 'src/service/histogram-helper/types.histogram-helper';
import { StorageProviderComplianceWeekResponse } from 'src/service/storage-provider/types.storage-provider';
import { IpniMisreportingCheckerService } from 'src/service/ipni-misreporting-checker/ipni-misreporting-checker.service';
import { CacheTTL } from '@nestjs/cache-manager';

@Controller('stats/providers')
@CacheTTL(1000 * 60 * 60) // 1 hour
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
  public async getAggregatedProvidersIPNIReportingStatus(): Promise<AggregatedProvidersIPNIReportingStatus> {
    return await this.ipniMisreportingCheckerService.getAggregatedProvidersReportingStatus();
  }

  @Get('clients')
  @ApiOkResponse({ type: HistogramWeekResponse })
  public async getProviderClients(): Promise<HistogramWeekResponse> {
    return await this.storageProviderService.getProviderClients(false);
  }

  @Get('biggest-client-distribution')
  @ApiOkResponse({ type: HistogramWeekResponse })
  public async getProviderBiggestClientDistribution(): Promise<HistogramWeekResponse> {
    return await this.storageProviderService.getProviderBiggestClientDistribution(
      false,
    );
  }

  @Get('retrievability')
  @ApiOkResponse({ type: RetrievabilityWeekResponse })
  public async getProviderRetrievability(): Promise<RetrievabilityWeekResponse> {
    return await this.storageProviderService.getProviderRetrievability(false);
  }

  @Get('compliance')
  @ApiOkResponse({ type: StorageProviderComplianceWeekResponse })
  public async getProviderCompliance(): Promise<StorageProviderComplianceWeekResponse> {
    return await this.storageProviderService.getProviderCompliance(false);
  }
}
