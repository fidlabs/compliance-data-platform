import { Controller, Get, Query } from '@nestjs/common';
import { StorageProviderService } from 'src/service/storage-provider/storage-provider.service';
import {
  ApiExcludeController,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import {
  HistogramWeekResponse,
  RetrievabilityWeekResponse,
} from 'src/service/histogram-helper/types.histogram-helper';
import {
  StorageProviderComplianceMetrics,
  StorageProviderComplianceWeekResponse,
} from 'src/service/storage-provider/types.storage-provider';
import { CacheTTL } from '@nestjs/cache-manager';
import { IpniMisreportingCheckerService } from 'src/service/ipni-misreporting-checker/ipni-misreporting-checker.service';
import {
  AggregatedProvidersIPNIReportingStatus,
  AggregatedProvidersIPNIReportingStatusWeekly,
} from 'src/service/ipni-misreporting-checker/types.ipni-misreporting-checker';
import { StorageProviderComplianceMetricsRequest } from 'src/controller/storage-providers/types.storage-providers';
import { GetRetrievabilityWeeklyRequest } from '../allocators/types.allocator-stats';
import { stringToBool } from 'src/utils/utils';

@Controller('stats/acc/providers')
@CacheTTL(1000 * 60 * 30) // 30 minutes
export class StorageProvidersAccStatsController {
  protected isAccumulative: boolean = true;

  constructor(
    private readonly storageProviderService: StorageProviderService,
    private readonly ipniMisreportingCheckerService: IpniMisreportingCheckerService,
  ) {}

  @Get('clients')
  @ApiOkResponse({ type: HistogramWeekResponse })
  public async getProviderClientsWeekly(): Promise<HistogramWeekResponse> {
    return await this.storageProviderService.getProviderClientsWeekly(
      this.isAccumulative,
    );
  }

  @Get('biggest-client-distribution')
  @ApiOkResponse({ type: HistogramWeekResponse })
  public async getProviderBiggestClientDistributionWeekly(): Promise<HistogramWeekResponse> {
    return await this.storageProviderService.getProviderBiggestClientDistributionWeekly(
      this.isAccumulative,
    );
  }

  @Get('retrievability')
  @ApiOkResponse({ type: RetrievabilityWeekResponse })
  public async getProviderRetrievabilityWeekly(
    @Query() query: GetRetrievabilityWeeklyRequest,
  ): Promise<RetrievabilityWeekResponse> {
    return await this.storageProviderService.getProviderRetrievabilityWeekly(
      this.isAccumulative,
      stringToBool(query?.openDataOnly),
      stringToBool(query?.httpRetrievability),
    );
  }

  @Get('compliance-data')
  @ApiOkResponse({ type: StorageProviderComplianceWeekResponse })
  public async getProviderComplianceWeekly(
    @Query() spMetricsToCheck: StorageProviderComplianceMetricsRequest,
  ): Promise<StorageProviderComplianceWeekResponse> {
    return await this.storageProviderService.getProviderComplianceWeekly(
      this.isAccumulative,
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
  public async getAggregatedProvidersIPNIReportingStatusWeekly(): Promise<AggregatedProvidersIPNIReportingStatusWeekly> {
    return await this.ipniMisreportingCheckerService.getAggregatedProvidersReportingStatusWeekly();
  }
}

@Controller('stats/providers')
@ApiExcludeController()
@CacheTTL(1000 * 60 * 30) // 30 minutes
export class StorageProvidersStatsController extends StorageProvidersAccStatsController {
  constructor(
    storageProviderService: StorageProviderService,
    ipniMisreportingCheckerService: IpniMisreportingCheckerService,
  ) {
    super(storageProviderService, ipniMisreportingCheckerService);
    this.isAccumulative = false;
  }
}
