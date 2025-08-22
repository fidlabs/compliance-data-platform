import { CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { FilPlusEditionRequest } from 'src/controller/base/program-round-controller-base';
import { StorageProviderComplianceMetricsRequest } from 'src/controller/storage-providers/types.storage-providers';
import {
  HistogramWeekResponse,
  RetrievabilityWeekResponse,
} from 'src/service/histogram-helper/types.histogram-helper';
import { IpniMisreportingCheckerService } from 'src/service/ipni-misreporting-checker/ipni-misreporting-checker.service';
import {
  AggregatedProvidersIPNIReportingStatus,
  AggregatedProvidersIPNIReportingStatusWeekly,
} from 'src/service/ipni-misreporting-checker/types.ipni-misreporting-checker';
import { StorageProviderService } from 'src/service/storage-provider/storage-provider.service';
import {
  StorageProviderComplianceMetrics,
  StorageProviderComplianceWeekResponse,
} from 'src/service/storage-provider/types.storage-provider';
import { stringToBool, stringToNumber } from 'src/utils/utils';
import { GetRetrievabilityWeeklyRequest } from '../allocators/types.allocator-stats';
import { DEFAULT_FILPLUS_EDITION_ID } from 'src/utils/filplus-edition';

@Controller('stats/acc/providers')
@CacheTTL(1000 * 60 * 30) // 30 minutes
export class StorageProvidersAccStatsController {
  constructor(
    private readonly storageProviderService: StorageProviderService,
    private readonly ipniMisreportingCheckerService: IpniMisreportingCheckerService,
  ) {}

  @Get('clients')
  @ApiOkResponse({ type: HistogramWeekResponse })
  public async getProviderClientsWeekly(
    @Query() query: FilPlusEditionRequest,
  ): Promise<HistogramWeekResponse> {
    return await this.storageProviderService.getProviderClientsWeekly(
      stringToNumber(query.roundId) ?? DEFAULT_FILPLUS_EDITION_ID,
    );
  }

  @Get('biggest-client-distribution')
  @ApiOkResponse({ type: HistogramWeekResponse })
  public async getProviderBiggestClientDistributionWeekly(
    @Query() query: FilPlusEditionRequest,
  ): Promise<HistogramWeekResponse> {
    return await this.storageProviderService.getProviderBiggestClientDistributionWeekly(
      stringToNumber(query.roundId) ?? DEFAULT_FILPLUS_EDITION_ID,
    );
  }

  @Get('retrievability')
  @ApiOkResponse({ type: RetrievabilityWeekResponse })
  public async getProviderRetrievabilityWeekly(
    @Query() query: GetRetrievabilityWeeklyRequest,
  ): Promise<RetrievabilityWeekResponse> {
    return await this.storageProviderService.getProviderRetrievabilityWeekly(
      stringToBool(query?.openDataOnly),
      stringToBool(query?.httpRetrievability),
      stringToNumber(query.roundId) ?? DEFAULT_FILPLUS_EDITION_ID,
    );
  }

  @Get('compliance-data')
  @ApiOkResponse({ type: StorageProviderComplianceWeekResponse })
  public async getProviderComplianceWeekly(
    @Query() spMetricsToCheck: StorageProviderComplianceMetricsRequest,
  ): Promise<StorageProviderComplianceWeekResponse> {
    return await this.storageProviderService.getProviderComplianceWeekly(
      StorageProviderComplianceMetrics.of(spMetricsToCheck),
    );
  }

  @Get('/aggregated-ipni-status')
  @CacheTTL(1000 * 60 * 60) // 1 hour
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

  @Get('/aggregated-ipni-status-weekly')
  @CacheTTL(1000 * 60 * 60) // 1 hour
  @ApiOperation({
    summary: 'Get aggregated storage providers IPNI reporting status over time',
  })
  @ApiOkResponse({
    description: 'Aggregated storage providers IPNI reporting status over time',
    type: AggregatedProvidersIPNIReportingStatusWeekly,
  })
  public async getAggregatedProvidersIPNIReportingStatusWeekly(
    @Query() query: FilPlusEditionRequest,
  ): Promise<AggregatedProvidersIPNIReportingStatusWeekly> {
    return await this.ipniMisreportingCheckerService.getAggregatedProvidersReportingStatusWeekly(
      stringToNumber(query.roundId) ?? DEFAULT_FILPLUS_EDITION_ID,
    );
  }
}
