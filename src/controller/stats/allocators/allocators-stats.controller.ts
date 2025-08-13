import { Controller, Get, Query } from '@nestjs/common';
import { AllocatorService } from 'src/service/allocator/allocator.service';
import { ApiOkResponse } from '@nestjs/swagger';
import { AllocatorSpsComplianceWeek } from 'src/service/allocator/types.allocator';
import {
  HistogramWeek,
  RetrievabilityWeek,
} from 'src/service/histogram-helper/types.histogram-helper';
import { CacheTTL } from '@nestjs/cache-manager';
import { StorageProviderComplianceMetricsRequest } from 'src/controller/storage-providers/types.storage-providers';
import { StorageProviderComplianceMetrics } from 'src/service/storage-provider/types.storage-provider';
import { GetRetrievabilityWeeklyRequest } from './types.allocator-stats';
import { stringToBool } from 'src/utils/utils';

@Controller('stats/acc/allocators')
@CacheTTL(1000 * 60 * 30) // 30 minutes
export class AllocatorsAccStatsController {
  constructor(private readonly allocatorService: AllocatorService) {}

  @Get('clients')
  @ApiOkResponse({ type: HistogramWeek })
  public async getAllocatorClientsWeekly(): Promise<HistogramWeek> {
    return await this.allocatorService.getStandardAllocatorClientsWeekly();
  }

  @Get('retrievability')
  @ApiOkResponse({ type: RetrievabilityWeek })
  public async getAllocatorRetrievabilityWeekly(
    @Query() query: GetRetrievabilityWeeklyRequest,
  ): Promise<RetrievabilityWeek> {
    return await this.allocatorService.getStandardAllocatorRetrievabilityWeekly(
      stringToBool(query?.openDataOnly),
      stringToBool(query?.httpRetrievability),
    );
  }

  @Get('biggest-client-distribution')
  @ApiOkResponse({ type: HistogramWeek })
  public async getAllocatorBiggestClientDistributionWeekly(): Promise<HistogramWeek> {
    return await this.allocatorService.getStandardAllocatorBiggestClientDistributionWeekly();
  }

  @Get('sps-compliance')
  @ApiOkResponse({ type: AllocatorSpsComplianceWeek })
  public async getAllocatorSpsComplianceWeekly(
    @Query() spMetricsToCheck: StorageProviderComplianceMetricsRequest,
  ): Promise<AllocatorSpsComplianceWeek> {
    return await this.allocatorService.getStandardAllocatorSpsComplianceWeekly(
      StorageProviderComplianceMetrics.of(spMetricsToCheck),
    );
  }
}
