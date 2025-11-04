import { Cache, CACHE_MANAGER, CacheTTL } from '@nestjs/cache-manager';
import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Logger,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { AllocatorService } from 'src/service/allocator/allocator.service';
import {
  AllocatorAuditOutcomesData,
  AllocatorAuditStatesData,
  AllocatorAuditTimesByMonthData,
  AllocatorAuditTimesByRoundData,
} from 'src/service/allocator/types.allocator';
import { StorageProviderComplianceMetrics } from 'src/service/storage-provider/types.storage-provider';
import { Cacheable } from 'src/utils/cacheable';
import {
  getCurrentFilPlusEdition,
  getFilPlusEditionByTimestamp,
} from 'src/utils/filplus-edition';
import {
  lastWeek,
  stringToBool,
  stringToDate,
  stringToNumber,
} from 'src/utils/utils';
import { FilPlusEditionControllerBase } from '../base/filplus-edition-controller-base';
import {
  GetAllocatorsRequest,
  GetAllocatorsLatestScoresRankingRequest,
  GetAllocatorsLatestScoresRankingResponse,
  GetDatacapFlowDataRequest,
  GetDatacapFlowDataResponse,
  GetWeekAllocatorsWithSpsComplianceRequest,
  GetWeekAllocatorsWithSpsComplianceRequestData,
  AllocatorDataType,
  GetAllocatorsScoresSummaryByMetricRequest,
  GetAllocatorsScoresSummaryByMetricResponse,
} from './types.allocators';
import { FilPlusEditionRequest } from '../base/types.filplus-edition-controller-base';
import { AllocatorScoringService } from 'src/service/allocator-scoring/allocator-scoring.service';
import { PrismaService } from 'src/db/prisma.service';
import { getAllocatorsScoresSummaryByMetric } from 'prisma/generated/client/sql';

@Controller('allocators')
@CacheTTL(1000 * 60 * 30) // 30 minutes
export class AllocatorsController extends FilPlusEditionControllerBase {
  private readonly logger = new Logger(AllocatorsController.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly allocatorService: AllocatorService,
    private readonly allocatorScoringService: AllocatorScoringService,
    private readonly prismaService: PrismaService,
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
    const cutoffDate = stringToDate(query.cutoffDate);

    const dcFlowData =
      await this.allocatorService.getDatacapFlowData(cutoffDate);

    return {
      cutoffDate: stringToDate(query.cutoffDate) ?? new Date(),
      filPlusEditionId: query.cutoffDate
        ? getFilPlusEditionByTimestamp(cutoffDate.getTime()).id
        : getCurrentFilPlusEdition().id,
      data: dcFlowData,
    };
  }

  @Get('/latest-scores')
  @ApiOperation({
    summary: 'Get allocators latest scores ranking',
  })
  @ApiOkResponse({
    description: 'Allocators latest scores ranking',
    type: GetAllocatorsLatestScoresRankingResponse,
    isArray: true,
  })
  public async getAllocatorsLatestScoresRanking(
    @Query() query: GetAllocatorsLatestScoresRankingRequest,
  ): Promise<GetAllocatorsLatestScoresRankingResponse[]> {
    return (
      await this.allocatorScoringService.getLatestScores(query.dataType)
    ).map((item) => ({
      ...item,
      dataType: item.dataType as AllocatorDataType,
    }));
  }

  @Get('/scores-summary-by-metric')
  @ApiOperation({
    summary:
      'Get summary of allocators scores grouped by metric and week/month',
  })
  @ApiOkResponse({
    description: 'Summary of allocators scores',
    type: GetAllocatorsScoresSummaryByMetricResponse,
    isArray: true,
  })
  public async getAllocatorsScoresSummaryByMetric(
    @Query() query: GetAllocatorsScoresSummaryByMetricRequest,
  ): Promise<GetAllocatorsScoresSummaryByMetricResponse[]> {
    query.groupBy ??= 'week';

    if (query.groupBy && !['week', 'month'].includes(query.groupBy)) {
      throw new BadRequestException(
        `Invalid groupBy value: ${query.groupBy}, must be 'week' or 'month'`,
      );
    }

    return (
      await this.prismaService.$queryRawTyped(
        getAllocatorsScoresSummaryByMetric(
          query.groupBy,
          query.dataType,
          stringToNumber(query.mediumScoreThreshold),
          stringToNumber(query.highScoreThreshold),
          stringToBool(query.includeDetails),
        ),
      )
    ).map((item) => ({
      ...item,
      data: item.data as [],
    }));
  }

  @Get('/audit-states')
  @ApiOperation({
    summary: 'Get audit states data for allocators',
  })
  @ApiOkResponse({
    description: 'Audit states data for allocators',
    type: AllocatorAuditStatesData,
    isArray: true,
  })
  public async getAuditStatesData(
    @Query() query: FilPlusEditionRequest,
  ): Promise<AllocatorAuditStatesData[]> {
    return await this.allocatorService.getAuditStatesData(
      this.getFilPlusEditionFromRequest(query) ?? getCurrentFilPlusEdition(),
    );
  }

  @Get('/audit-times-by-round')
  @ApiOperation({
    summary: 'Get audit times data for allocators by audit round',
  })
  @ApiOkResponse({
    description: 'Audit times data for allocators by audit round',
    type: AllocatorAuditTimesByRoundData,
  })
  public async getAuditTimesByRoundData(
    @Query() query: FilPlusEditionRequest,
  ): Promise<AllocatorAuditTimesByRoundData> {
    return await this.allocatorService.getAuditTimesByRoundData(
      this.getFilPlusEditionFromRequest(query) ?? getCurrentFilPlusEdition(),
    );
  }

  @Get('/audit-times-by-month')
  @ApiOperation({
    summary: 'Get audit times data for allocators by month',
  })
  @ApiOkResponse({
    description: 'Audit times data for allocators by month',
    type: AllocatorAuditTimesByMonthData,
    isArray: true,
  })
  public async getAuditTimesByMonthData(
    @Query() query: FilPlusEditionRequest,
  ): Promise<AllocatorAuditTimesByMonthData[]> {
    return await this.allocatorService.getAuditTimesByMonthData(
      this.getFilPlusEditionFromRequest(query),
    );
  }

  @Get('/audit-outcomes')
  @ApiOperation({
    summary: 'Get audit outcomes data for allocators by month',
  })
  @ApiOkResponse({
    description: 'Audit outcomes data for allocators by month',
    type: AllocatorAuditOutcomesData,
    isArray: true,
  })
  public async getAuditOutcomesData(
    @Query() query: FilPlusEditionRequest,
  ): Promise<AllocatorAuditOutcomesData[]> {
    return await this.allocatorService.getAuditOutcomesData(
      this.getFilPlusEditionFromRequest(query),
    );
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
      query.dataType,
      this.getFilPlusEditionFromRequest(query),
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
