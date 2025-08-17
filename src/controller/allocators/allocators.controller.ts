import { Controller, Get, Inject, Logger, Query } from '@nestjs/common';
import { Cache, CACHE_MANAGER, CacheTTL } from '@nestjs/cache-manager';
import { AllocatorService } from 'src/service/allocator/allocator.service';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { StorageProviderComplianceMetrics } from 'src/service/storage-provider/types.storage-provider';
import {
  GetAllocatorsRequest,
  GetDatacapFlowDataRequest,
  GetDatacapFlowDataResponse,
  GetWeekAllocatorsWithSpsComplianceRequest,
  GetWeekAllocatorsWithSpsComplianceRequestData,
} from './types.allocators';
import { Cacheable } from 'src/utils/cacheable';
import { ControllerBase } from '../base/controller-base';
import { lastWeek, stringToBool, stringToDate } from 'src/utils/utils';
import {
  AllocatorAuditStateData,
  AllocatorAuditTimesData,
} from 'src/service/allocator/types.allocator';

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

  @Get('/dc-flow')
  @ApiOperation({
    summary: 'Get datacap flow data for allocators',
  })
  @ApiOkResponse({
    description: 'Datacap flow data for allocators',
    type: GetDatacapFlowDataResponse,
  })
  public async getDatacapFlowData(
    @Query() query: GetDatacapFlowDataRequest,
  ): Promise<GetDatacapFlowDataResponse> {
    const dcFlowData = await this.allocatorService.getDatacapFlowData(
      stringToDate(query.cutoffDate),
    );

    return {
      cutoffDate: stringToDate(query.cutoffDate) ?? new Date(),
      data: dcFlowData,
    };
  }

  @Get('/audit-state')
  @ApiOperation({
    summary: 'Get audit state data for allocators',
  })
  @ApiOkResponse({
    description: 'Audit state data for allocators',
    type: AllocatorAuditStateData,
    isArray: true,
  })
  public async getAuditStateData(): Promise<AllocatorAuditStateData[]> {
    return await this.allocatorService.getAuditStateData();
  }

  @Get('/audit-times')
  @ApiOperation({
    summary: 'Get audit times data for allocators',
  })
  @ApiOkResponse({
    description: 'Audit times data for allocators',
    type: AllocatorAuditTimesData,
  })
  public async getAuditTimesData(): Promise<AllocatorAuditTimesData> {
    return await this.allocatorService.getAuditTimesData();
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
    const allocators = await this.allocatorService.getAllocators(
      stringToBool(query.showInactive) ?? true,
      stringToBool(query.isMetaallocator),
      query.filter,
      query.usingMetaallocator,
    );

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
    const allocators = await this.allocatorService.getAllocators(
      true,
      null,
      query.filter,
      query.usingMetaallocator,
    );

    const weekAllocatorsSpsCompliance =
      await this.allocatorService.getWeekStandardAllocatorSpsCompliance(
        stringToDate(query.week!)!,
        StorageProviderComplianceMetrics.of(query),
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
    query.week ??= lastWeek().toISOString(); // last week default

    let allocators = await this._getWeekAllocatorsWithSpsCompliance(query);

    if (query.complianceScore) {
      allocators = allocators.filter(
        (allocator) => allocator.complianceScore === query.complianceScore,
      );
    }

    return this.withPaginationInfo(
      {
        week: query.week,
        metricsChecked: StorageProviderComplianceMetrics.of(query),
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
