import { Controller, Get, Inject, Logger, Query } from '@nestjs/common';
import { Cache, CACHE_MANAGER, CacheTTL } from '@nestjs/cache-manager';
import { AllocatorService } from 'src/service/allocator/allocator.service';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { StorageProviderComplianceMetricsResponse } from 'src/service/storage-provider/types.storage-provider';
import { DateTime } from 'luxon';
import {
  GetAllocatorsRequest,
  GetWeekAllocatorsWithSpsComplianceRequest,
  GetWeekAllocatorsWithSpsComplianceRequestData,
} from './types.allocators';
import { Cacheable } from 'src/utils/cacheable';
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
  public async getAllocators(@Query() query: GetAllocatorsRequest) {
    let allocators = await this.allocatorService.getAllocators();

    if (query.addressId) {
      allocators = allocators.filter(
        (allocator) => allocator.addressId === query.addressId,
      );
    }

    return this.withPaginationInfo(
      {
        count: allocators.length,
        data: this.paginated(this.sorted(allocators, query), query),
      },
      query,
      allocators.length,
    );
  }

  @Cacheable({ ttl: 1000 * 60 * 30 }) // 30 minutes
  private async _getWeekAllocatorsWithSpsCompliance(
    query: GetWeekAllocatorsWithSpsComplianceRequestData,
  ) {
    const allocators = await this.allocatorService.getAllocators();
    const weekAllocatorsSpsCompliance =
      await this.allocatorService.getWeekStandardAllocatorSpsCompliance(
        query.week!,
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
    return weekAllocatorsCompliance
      .map((allocator) => {
        const allocatorData = allocators.find(
          (a) => a.addressId === allocator.allocator,
        );

        return (
          allocatorData && {
            complianceScore: allocator.complianceScore,
            ...allocatorData,
          }
        );
      })
      .filter((allocator) => allocator?.addressId);
  }

  @Get('/compliance-data')
  @ApiOperation({
    summary: 'Get list of allocators with compliance score',
  })
  @ApiOkResponse({
    description: 'List of allocators with compliance score',
    type: null,
  })
  public async getWeekAllocatorsWithSpsCompliance(
    @Query() query: GetWeekAllocatorsWithSpsComplianceRequest,
  ) {
    query.week ??= DateTime.now()
      .toUTC()
      .minus({ week: 1 })
      .startOf('week')
      .toJSDate(); // last week default

    let allocators = await this._getWeekAllocatorsWithSpsCompliance(query);

    if (query.complianceScore) {
      allocators = allocators.filter(
        (allocator) => allocator.complianceScore === query.complianceScore,
      );
    }

    if (query.addressId) {
      allocators = allocators.filter(
        (allocator) => allocator.addressId === query.addressId,
      );
    }

    return this.withPaginationInfo(
      {
        week: query.week,
        metricsChecked: new StorageProviderComplianceMetricsResponse(
          query.spMetricsToCheck?.retrievability !== 'false',
          query.spMetricsToCheck?.numberOfClients !== 'false',
          query.spMetricsToCheck?.totalDealSize !== 'false',
        ),
        complianceThresholdPercentage: query.complianceThresholdPercentage,
        complianceScore: query.complianceScore,
        count: allocators.length,
        data: this.paginated(this.sorted(allocators, query), query),
      },
      query,
      allocators.length,
    );
  }
}
