import { CacheTTL } from '@nestjs/cache-manager';
import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
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
import { stringToBool, stringToNumber } from 'src/utils/utils';
import { FilPlusEditionRequest } from 'src/controller/base/types.filplus-edition-controller-base';
import { DataType } from 'src/controller/allocators/types.allocators';
import { GetAllocatorRetrievabilityWeeklyRequest } from './types.allocator-stats';

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
    return await this.allocatorService.getStandardAllocatorClientsWeekly(
      this.getFilPlusEditionFromRequest(query),
    );
  }

  @Get('retrievability')
  @ApiOkResponse({ type: RetrievabilityWeek })
  public async getAllocatorRetrievabilityWeekly(
    @Query() query: GetAllocatorRetrievabilityWeeklyRequest,
  ): Promise<RetrievabilityWeek> {
    if (
      stringToBool(query?.openDataOnly) &&
      stringToNumber(query?.editionId) === 5
    ) {
      throw new BadRequestException(
        'Open data filter is not available for Fil+ Edition 5',
      );
    }

    return await this.allocatorService.getStandardActiveAllocatorRetrievabilityWeekly(
      stringToBool(query?.openDataOnly) ? DataType.openData : null,
      this.getFilPlusEditionFromRequest(query),
    );
  }

  @Get('biggest-client-distribution')
  @ApiOkResponse({ type: HistogramWeek })
  public async getAllocatorBiggestClientDistributionWeekly(
    @Query() query: FilPlusEditionRequest,
  ): Promise<HistogramWeek> {
    return await this.allocatorService.getStandardAllocatorBiggestClientDistributionWeekly(
      this.getFilPlusEditionFromRequest(query),
    );
  }

  @Get('sps-compliance')
  @ApiOkResponse({ type: AllocatorSpsComplianceWeek })
  public async getAllocatorSpsComplianceWeekly(
    @Query() spMetricsToCheck: StorageProviderComplianceMetricsRequest,
  ): Promise<AllocatorSpsComplianceWeek> {
    return await this.allocatorService.getStandardAllocatorSpsComplianceWeekly(
      StorageProviderComplianceMetrics.of(spMetricsToCheck),
      this.getFilPlusEditionFromRequest(spMetricsToCheck),
    );
  }
}
