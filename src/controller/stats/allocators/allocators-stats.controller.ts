import { Controller, Get, Query } from '@nestjs/common';
import { AllocatorService } from 'src/service/allocator/allocator.service';
import { ApiOkResponse } from '@nestjs/swagger';
import { AllocatorSpsComplianceWeekResponse } from 'src/service/allocator/types.allocator';
import {
  HistogramWeekResponse,
  RetrievabilityWeekResponse,
} from 'src/service/histogram-helper/types.histogram-helper';
import { CacheTTL } from '@nestjs/cache-manager';
import { StorageProviderComplianceMetricsRequest } from 'src/controller/storage-providers/types.storage-providers';
import { StorageProviderComplianceMetrics } from 'src/service/storage-provider/types.storage-provider';
import { GetRetrievabilityWeeklyRequest } from './types.allocator-stats';
import { stringToBool } from 'src/utils/utils';
import { FilPlusEditionRequest } from 'src/controller/base/program-round-controller-base';

@Controller('stats/acc/allocators')
@CacheTTL(1000 * 60 * 30) // 30 minutes
export class AllocatorsAccStatsController {
  constructor(private readonly allocatorService: AllocatorService) {}

  // client diversity tab
  @Get('clients')
  @ApiOkResponse({ type: HistogramWeekResponse })
  public async getAllocatorClientsWeekly(
    @Query() query: FilPlusEditionRequest,
  ): Promise<HistogramWeekResponse> {
    return await this.allocatorService.getStandardAllocatorClientsWeekly(
      query.roundId,
    );
  }

  @Get('retrievability')
  @ApiOkResponse({ type: RetrievabilityWeekResponse })
  public async getAllocatorRetrievabilityWeekly(
    @Query() query: GetRetrievabilityWeeklyRequest,
  ): Promise<RetrievabilityWeekResponse> {
    return await this.allocatorService.getStandardAllocatorRetrievabilityWeekly(
      stringToBool(query?.openDataOnly),
      stringToBool(query?.httpRetrievability),
    );
  }

  @Get('biggest-client-distribution')
  @ApiOkResponse({ type: HistogramWeekResponse })
  public async getAllocatorBiggestClientDistributionWeekly(): Promise<HistogramWeekResponse> {
    return await this.allocatorService.getStandardAllocatorBiggestClientDistributionWeekly();
  }

  @Get('sps-compliance')
  @ApiOkResponse({ type: AllocatorSpsComplianceWeekResponse })
  public async getAllocatorSpsComplianceWeekly(
    @Query() spMetricsToCheck: StorageProviderComplianceMetricsRequest,
  ): Promise<AllocatorSpsComplianceWeekResponse> {
    return await this.allocatorService.getStandardAllocatorSpsComplianceWeekly(
      StorageProviderComplianceMetrics.of(spMetricsToCheck),
    );
  }
}
