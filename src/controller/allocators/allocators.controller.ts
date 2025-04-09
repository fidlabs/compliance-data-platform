import { Controller, Get, Inject, Logger, Query } from '@nestjs/common';
import { Cache, CACHE_MANAGER, CacheTTL } from '@nestjs/cache-manager';
import { AllocatorService } from 'src/service/allocator/allocator.service';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { StorageProviderComplianceMetricsResponse } from 'src/service/storage-provider/types.storage-provider';
import { DateTime } from 'luxon';
import { GetWeekAllocatorsWithSpsComplianceRequest } from './types.allocators';
import { Cacheable } from 'src/utils/cacheable';
import { PaginationSortingInfo } from '../base/types.controller-base';
import { ControllerBase } from '../base/controller-base';

@Controller('allocators')
@CacheTTL(1000 * 60 * 30) // 30 minutes
export class AllocatorsController extends ControllerBase {
  private readonly logger = new Logger(AllocatorsController.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly allocatorService: AllocatorService,
  ) {
    super();
  }

  @Get()
  @ApiOperation({
    summary: 'Get list of all allocators',
  })
  @ApiOkResponse({
    description: 'List of allocators',
    type: null,
  })
  public async getAllocators(@Query() query: PaginationSortingInfo) {
    const allocators = await this.allocatorService.getAllocators();

    for (const a of allocators) {
      a.allowanceArray = undefined;
    }

    return this.withPaginationInfo(
      {
        count: allocators.length.toString(),
        data: this.paginated(this.sorted(allocators, query), query),
      },
      query,
    );
  }

  @Cacheable({ ttl: 1000 * 60 * 30 }) // 30 minutes
  private async _getWeekAllocatorsWithSpsCompliance(
    @Query() query: GetWeekAllocatorsWithSpsComplianceRequest,
  ) {
    query.week ??= DateTime.now()
      .toUTC()
      .minus({ week: 1 })
      .startOf('week')
      .toJSDate(); // last week default

    const allocators = await this.allocatorService.getAllocators();
    const weekAllocatorsSpsCompliance =
      await this.allocatorService.getWeekStandardAllocatorSpsCompliance(
        query.week,
        true,
        query.spMetricsToCheck,
      );

    const weekAllocatorsCompliance = weekAllocatorsSpsCompliance.allocators.map(
      (allocator) =>
        this.allocatorService.calculateAllocatorComplianceScore(
          allocator,
          query.complianceThresholdPercentage,
        ),
    );

    // this effectively filters out metaallocators and allocators from previous fil+ edition
    const result = weekAllocatorsCompliance.map((allocator) => {
      const allocatorData = allocators.find(
        (a) => a.addressId === allocator.allocator,
      );

      return {
        complianceScore: allocator.complianceScore,
        ...allocatorData,
      };
    });

    return {
      week: query.week,
      metricsChecked: new StorageProviderComplianceMetricsResponse(
        query.spMetricsToCheck?.retrievability !== 'false',
        query.spMetricsToCheck?.numberOfClients !== 'false',
        query.spMetricsToCheck?.totalDealSize !== 'false',
      ),
      complianceThresholdPercentage: query.complianceThresholdPercentage,
      averageSuccessRate: weekAllocatorsSpsCompliance.averageSuccessRate,
      count: result.length.toString(),
      data: result,
    };
  }

  @Get('/compliance-data')
  @ApiOperation({
    summary: 'Get list of allocators with compliance',
  })
  @ApiOkResponse({
    description: 'List of allocators with compliance',
    type: null,
  })
  public async getWeekAllocatorsWithSpsCompliance(
    @Query() query: GetWeekAllocatorsWithSpsComplianceRequest,
  ) {
    const result = await this._getWeekAllocatorsWithSpsCompliance(query);

    return this.withPaginationInfo(
      {
        ...result,
        data: this.paginated(this.sorted(result.data, query), query),
      },
      query,
    );
  }
}
