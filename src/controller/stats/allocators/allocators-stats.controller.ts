import { CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { FilPlusEditionRequest } from 'src/controller/base/program-round-controller-base';
import { StorageProviderComplianceMetricsRequest } from 'src/controller/storage-providers/types.storage-providers';
import { AllocatorService } from 'src/service/allocator/allocator.service';
import { AllocatorSpsComplianceWeekResponse } from 'src/service/allocator/types.allocator';
import {
  HistogramWeekResponse,
  RetrievabilityWeekResponse,
} from 'src/service/histogram-helper/types.histogram-helper';
import { StorageProviderComplianceMetrics } from 'src/service/storage-provider/types.storage-provider';
import { stringToBool, stringToNumber } from 'src/utils/utils';
import { GetRetrievabilityWeeklyRequest } from './types.allocator-stats';
import { DEFAULT_FILPLUS_EDITION_ID } from 'src/utils/filplus-edition';

@Controller('stats/acc/allocators')
@CacheTTL(1000 * 60 * 30) // 30 minutes
export class AllocatorsAccStatsController {
  constructor(private readonly allocatorService: AllocatorService) {}

  @Get('clients')
  @ApiOkResponse({ type: HistogramWeekResponse })
  public async getAllocatorClientsWeekly(
    @Query() query: FilPlusEditionRequest,
  ): Promise<HistogramWeekResponse> {
    return await this.allocatorService.getStandardAllocatorClientsWeekly(
      stringToNumber(query.roundId) ?? DEFAULT_FILPLUS_EDITION_ID,
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
      stringToNumber(query.roundId) ?? DEFAULT_FILPLUS_EDITION_ID,
    );
  }

  @Get('biggest-client-distribution')
  @ApiOkResponse({ type: HistogramWeekResponse })
  public async getAllocatorBiggestClientDistributionWeekly(
    @Query() query: FilPlusEditionRequest,
  ): Promise<HistogramWeekResponse> {
    return await this.allocatorService.getStandardAllocatorBiggestClientDistributionWeekly(
      stringToNumber(query.roundId) ?? DEFAULT_FILPLUS_EDITION_ID,
    );
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
