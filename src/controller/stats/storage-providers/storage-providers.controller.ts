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
import { AggregatedProvidersIPNIReportingStatus } from 'src/service/ipni-misreporting-checker/types.ipni-misreporting-checker';

@Controller('stats/acc/providers')
@CacheTTL(1000 * 60 * 30) // 30 minutes
export class StorageProvidersAccController {
  protected isAccumulative: boolean = true;

  constructor(
    private readonly storageProviderService: StorageProviderService,
    private readonly ipniMisreportingCheckerService: IpniMisreportingCheckerService,
  ) {}

  @Get('clients')
  @ApiOkResponse({ type: HistogramWeekResponse })
  public async getProviderClients(): Promise<HistogramWeekResponse> {
    return await this.storageProviderService.getProviderClientsWeekly(
      this.isAccumulative,
    );
  }

  @Get('biggest-client-distribution')
  @ApiOkResponse({ type: HistogramWeekResponse })
  public async getProviderBiggestClientDistribution(): Promise<HistogramWeekResponse> {
    return await this.storageProviderService.getProviderBiggestClientDistributionWeekly(
      this.isAccumulative,
    );
  }

  @Get('retrievability')
  @ApiOkResponse({ type: RetrievabilityWeekResponse })
  public async getProviderRetrievability(): Promise<RetrievabilityWeekResponse> {
    return await this.storageProviderService.getProviderRetrievabilityWeekly(
      this.isAccumulative,
    );
  }

  @Get('compliance-data')
  @ApiOkResponse({ type: StorageProviderComplianceWeekResponse })
  public async getProviderCompliance(
    @Query() metricsToCheck: StorageProviderComplianceMetrics,
  ): Promise<StorageProviderComplianceWeekResponse> {
    return await this.storageProviderService.getProviderComplianceWeekly(
      this.isAccumulative,
      metricsToCheck,
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
}

@Controller('stats/providers')
@ApiExcludeController()
@CacheTTL(1000 * 60 * 30) // 30 minutes
export class StorageProvidersController extends StorageProvidersAccController {
  constructor(
    storageProviderService: StorageProviderService,
    ipniMisreportingCheckerService: IpniMisreportingCheckerService,
  ) {
    super(storageProviderService, ipniMisreportingCheckerService);
    this.isAccumulative = false;
  }
}
