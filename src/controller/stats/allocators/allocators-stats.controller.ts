import { CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { FilPlusEditionControllerBase } from 'src/controller/base/filplus-edition-controller-base';
import { StorageProviderComplianceMetricsRequest } from 'src/controller/storage-providers/types.storage-providers';
import { AllocatorService } from 'src/service/allocator/allocator.service';
import { AllocatorSpsComplianceWeek } from 'src/service/allocator/types.allocator';
import {
  HistogramWeek,
  RetrievabilityWeek,
} from 'src/service/histogram-helper/types.histogram-helper';
import { StorageProviderComplianceMetrics } from 'src/service/storage-provider/types.storage-provider';
import { stringToBool } from 'src/utils/utils';
import { GetRetrievabilityWeeklyRequest } from './types.allocator-stats';
import { FilPlusEditionRequest } from 'src/controller/base/types.filplus-edition-controller-base';

@Controller('stats/acc/allocators')
@CacheTTL(1000 * 60 * 30) // 30 minutes
export class AllocatorsAccStatsController extends FilPlusEditionControllerBase {
  constructor(private readonly allocatorService: AllocatorService) {
    super();
  }

  @Get('clients')
  @ApiOkResponse({ type: HistogramWeek })
  public async getAllocatorClientsWeekly(
    @Query() query: FilPlusEditionRequest,
  ): Promise<HistogramWeek> {
    const filPlusEditionData = this.getFilPlusEditionFromRequest(query);

    return await this.allocatorService.getStandardAllocatorClientsWeekly(
      filPlusEditionData,
    );
  }

  @Get('retrievability')
  @ApiOkResponse({ type: RetrievabilityWeek })
  public async getAllocatorRetrievabilityWeekly(
    @Query() query: GetRetrievabilityWeeklyRequest,
  ): Promise<RetrievabilityWeek> {
    const filPlusEditionData = this.getFilPlusEditionFromRequest(query);

    return await this.allocatorService.getStandardAllocatorRetrievabilityWeekly(
      stringToBool(query?.openDataOnly),
      stringToBool(query?.httpRetrievability),
      filPlusEditionData,
    );
  }

  @Get('biggest-client-distribution')
  @ApiOkResponse({ type: HistogramWeek })
  public async getAllocatorBiggestClientDistributionWeekly(
    @Query() query: FilPlusEditionRequest,
  ): Promise<HistogramWeek> {
    const filPlusEditionData = this.getFilPlusEditionFromRequest(query);

    return await this.allocatorService.getStandardAllocatorBiggestClientDistributionWeekly(
      filPlusEditionData,
    );
  }

  @Get('sps-compliance')
  @ApiOkResponse({ type: AllocatorSpsComplianceWeek })
  public async getAllocatorSpsComplianceWeekly(
    @Query() spMetricsToCheck: StorageProviderComplianceMetricsRequest,
  ): Promise<AllocatorSpsComplianceWeek> {
    const filPlusEditionData =
      this.getFilPlusEditionFromRequest(spMetricsToCheck);

    return await this.allocatorService.getStandardAllocatorSpsComplianceWeekly(
      StorageProviderComplianceMetrics.of(spMetricsToCheck),
      filPlusEditionData,
    );
  }
}
