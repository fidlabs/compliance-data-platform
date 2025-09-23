import { CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { FilPlusEditionControllerBase } from 'src/controller/base/filplus-edition-controller-base';
import { FilPlusEditionRequest } from 'src/controller/base/types.filplus-edition-controller-base';
import { StorageProviderComplianceMetricsRequest } from 'src/controller/storage-providers/types.storage-providers';
import {
  HistogramWeek,
  RetrievabilityWeek,
} from 'src/service/histogram-helper/types.histogram-helper';
import { IpniMisreportingCheckerService } from 'src/service/ipni-misreporting-checker/ipni-misreporting-checker.service';
import {
  AggregatedProvidersIPNIReportingStatus,
  AggregatedProvidersIPNIReportingStatusWeekly,
} from 'src/service/ipni-misreporting-checker/types.ipni-misreporting-checker';
import { StorageProviderService } from 'src/service/storage-provider/storage-provider.service';
import {
  StorageProviderComplianceMetrics,
  StorageProviderComplianceWeek,
} from 'src/service/storage-provider/types.storage-provider';
import { stringToBool } from 'src/utils/utils';
import { GetRetrievabilityWeeklyRequest } from '../allocators/types.allocator-stats';

@Controller('stats/acc/providers')
@CacheTTL(1000 * 60 * 30) // 30 minutes
export class StorageProvidersAccStatsController extends FilPlusEditionControllerBase {
  constructor(
    private readonly storageProviderService: StorageProviderService,
    private readonly ipniMisreportingCheckerService: IpniMisreportingCheckerService,
  ) {
    super();
  }

  @Get('clients')
  @ApiOkResponse({ type: HistogramWeek })
  public async getProviderClientsWeekly(
    @Query() query: FilPlusEditionRequest,
  ): Promise<HistogramWeek> {
    return await this.storageProviderService.getProviderClientsWeekly(
      this.getFilPlusEditionFromRequest(query),
    );
  }

  @Get('biggest-client-distribution')
  @ApiOkResponse({ type: HistogramWeek })
  public async getProviderBiggestClientDistributionWeekly(
    @Query() query: FilPlusEditionRequest,
  ): Promise<HistogramWeek> {
    return await this.storageProviderService.getProviderBiggestClientDistributionWeekly(
      this.getFilPlusEditionFromRequest(query),
    );
  }

  @Get('retrievability')
  @ApiOkResponse({ type: RetrievabilityWeek })
  public async getProviderRetrievabilityWeekly(
    @Query() query: GetRetrievabilityWeeklyRequest,
  ): Promise<RetrievabilityWeek> {
    return await this.storageProviderService.getProviderRetrievabilityWeekly(
      stringToBool(query?.openDataOnly),
      query?.retrievabilityType,
      this.getFilPlusEditionFromRequest(query),
    );
  }

  @Get('compliance-data')
  @ApiOkResponse({ type: StorageProviderComplianceWeek })
  public async getProviderComplianceWeekly(
    @Query() spMetricsToCheck: StorageProviderComplianceMetricsRequest,
  ): Promise<StorageProviderComplianceWeek> {
    return await this.storageProviderService.getProviderComplianceWeekly(
      StorageProviderComplianceMetrics.of(spMetricsToCheck),
      this.getFilPlusEditionFromRequest(spMetricsToCheck),
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
      this.getFilPlusEditionFromRequest(query),
    );
  }
}
