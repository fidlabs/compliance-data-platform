import { Cache, CACHE_MANAGER, CacheTTL } from '@nestjs/cache-manager';
import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Logger,
  Param,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { DateTime } from 'luxon';
import { getAllocatorsScoresSummaryByMetric } from 'prisma/generated/client/sql';
import { PrismaService } from 'src/db/prisma.service';
import { AllocatorReportChecksService } from 'src/service/allocator-report-checks/allocator-report-checks.service';
import { AllocatorScoringService } from 'src/service/allocator-scoring/allocator-scoring.service';
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
  bigIntDiv,
  lastWeek,
  stringToBool,
  stringToDate,
  stringToNumber,
} from 'src/utils/utils';
import { FilPlusEditionControllerBase } from '../base/filplus-edition-controller-base';
import {
  DashboardStatistic,
  DashboardStatisticValue,
} from '../base/types.controller-base';
import { FilPlusEditionRequest } from '../base/types.filplus-edition-controller-base';
import {
  AllocatorDataType,
  AllocatorsDashboardStatistic,
  AllocatorsDashboardStatisticType,
  GetAllocatorsLatestScoresRankingRequest,
  GetAllocatorsLatestScoresRankingResponse,
  GetAllocatorsRequest,
  GetAllocatorsScoresSummaryByMetricRequest,
  GetAllocatorsScoresSummaryByMetricResponse,
  GetAllocatorsStatisticsRequest,
  GetAllocatorVerifiedClientsRequest,
  GetDatacapFlowDataRequest,
  GetDatacapFlowDataResponse,
  GetWeekAllocatorsWithSpsComplianceRequest,
  GetWeekAllocatorsWithSpsComplianceRequestData,
} from './types.allocators';

const dashboardStatisticsTitleDict: Record<
  AllocatorsDashboardStatisticType,
  AllocatorsDashboardStatistic['title']
> = {
  TOTAL_APPROVED_ALLOCATORS: 'Approved Allocators',
  TOTAL_ACTIVE_ALLOCATORS: 'Active Allocators',
  COMPLIANT_ALLOCATORS: 'Compliant Allocators',
  NON_COMPLIANT_ALLOCATORS: 'Non Compliant Allocators',
  NUMBER_OF_ALERTS: 'Alerts',
};

const dashboardStatisticsDescriptionDict: Record<
  AllocatorsDashboardStatisticType,
  AllocatorsDashboardStatistic['description']
> = {
  TOTAL_APPROVED_ALLOCATORS: null,
  TOTAL_ACTIVE_ALLOCATORS:
    'Number of allocators that spent Datacap in last 60 days',
  COMPLIANT_ALLOCATORS: `Percentage of Allocators with score above ${AllocatorService.COMPLIANT_ALLOCATORS_DASHBOARD_STAT_SCORE_PERCENTAGE_THRESHOLD * 100}%`,
  NON_COMPLIANT_ALLOCATORS: `Percentage of allocators with score below ${AllocatorService.NON_COMPLIANT_ALLOCATORS_DASHBOARD_STAT_SCORE_PERCENTAGE_THRESHOLD * 100}%`,
  NUMBER_OF_ALERTS: null,
};

@Controller('allocators')
@CacheTTL(1000 * 60 * 30) // 30 minutes
export class AllocatorsController extends FilPlusEditionControllerBase {
  private readonly logger = new Logger(AllocatorsController.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly allocatorService: AllocatorService,
    private readonly allocatorScoringService: AllocatorScoringService,
    private readonly allocatorReportChecksService: AllocatorReportChecksService,
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

  @Get(':allocatorId/verified-clients')
  @ApiOperation({
    summary: 'Get paginated list of verified clients for allocator',
  })
  @ApiOkResponse({
    description: 'Paginated list of verified clients for allocator',
    type: null,
  })
  public async getVerifiedClientsByAllocator(
    @Param('allocatorId') allocatorId: string,
    @Query() query: GetAllocatorVerifiedClientsRequest,
  ) {
    const verifiedClients =
      await this.allocatorService.getVerifiedClientsByAllocator(allocatorId);

    return this.withPaginationInfo(
      {
        data: this.paginated(this.sorted(verifiedClients, query), query),
      },
      query,
      verifiedClients.length,
    );
  }

  @Get('/statistics')
  @ApiOperation({
    summary: 'Get list of statistics regarding allocators',
  })
  @ApiOkResponse({
    description: 'List of statistics regarding allocators',
    type: [AllocatorsDashboardStatistic],
  })
  public async getAllocatorsStatistics(
    @Query() query: GetAllocatorsStatisticsRequest,
  ): Promise<AllocatorsDashboardStatistic[]> {
    const { interval = 'day' } = query;
    const cutoffDate = DateTime.now()
      .toUTC()
      .minus({ [interval]: 1 })
      .toJSDate();

    const [
      currentApprovedAllocatorsCount,
      previousApprovedAllocatorsCount,
      currentActiveAllocatorsCount,
      previousActiveAllocatorsCount,
      currentCompliantAllocatorsPercentage,
      previousCompliantAllocatorsPercentage,
      currentNonCompliantAllocatorsPercentage,
      previousNonCompliantAllocatorsPercentage,
      currentAlertsCount,
      previousAlertsCount,
    ] = await Promise.all([
      this.allocatorService.getApprovedAllocatorsStat(),
      this.allocatorService.getApprovedAllocatorsStat({ cutoffDate }),
      this.allocatorService.getActiveAllocatorsStat(),
      this.allocatorService.getActiveAllocatorsStat({ cutoffDate }),
      this.allocatorService.getCompliantAllocatorsStat(),
      this.allocatorService.getCompliantAllocatorsStat({ cutoffDate }),
      this.allocatorService.getNonCompliantAllocatorsStat(),
      this.allocatorService.getNonCompliantAllocatorsStat({ cutoffDate }),
      this.allocatorReportChecksService.getFailedReportChecksCount(),
      this.allocatorReportChecksService.getFailedReportChecksCount({
        date: cutoffDate,
      }),
    ]);

    return [
      this.calculateDashboardStatistic({
        type: 'TOTAL_APPROVED_ALLOCATORS',
        currentValue: {
          value: currentApprovedAllocatorsCount,
          type: 'numeric',
        },
        previousValue: {
          value: previousApprovedAllocatorsCount,
          type: 'numeric',
        },
        interval,
      }),
      this.calculateDashboardStatistic({
        type: 'TOTAL_ACTIVE_ALLOCATORS',
        currentValue: {
          value: currentActiveAllocatorsCount,
          type: 'numeric',
        },
        previousValue: {
          value: previousActiveAllocatorsCount,
          type: 'numeric',
        },
        interval,
      }),
      this.calculateDashboardStatistic({
        type: 'COMPLIANT_ALLOCATORS',
        currentValue: {
          value: currentCompliantAllocatorsPercentage,
          type: 'percentage',
        },
        previousValue: {
          value: previousCompliantAllocatorsPercentage,
          type: 'percentage',
        },
        interval,
      }),
      this.calculateDashboardStatistic({
        type: 'NON_COMPLIANT_ALLOCATORS',
        currentValue: {
          value: currentNonCompliantAllocatorsPercentage,
          type: 'percentage',
        },
        previousValue: {
          value: previousNonCompliantAllocatorsPercentage,
          type: 'percentage',
        },
        interval,
      }),
      this.calculateDashboardStatistic({
        type: 'NUMBER_OF_ALERTS',
        currentValue: {
          value: currentAlertsCount,
          type: 'numeric',
        },
        previousValue: {
          value: previousAlertsCount,
          type: 'numeric',
        },
        interval,
      }),
    ];
  }

  private calculateDashboardStatistic(options: {
    type: AllocatorsDashboardStatistic['type'];
    currentValue: DashboardStatisticValue;
    previousValue: DashboardStatisticValue;
    interval: DashboardStatistic['percentageChange']['interval'];
  }): AllocatorsDashboardStatistic {
    const { type, currentValue, previousValue, interval } = options;

    if (currentValue.type !== previousValue.type) {
      throw new TypeError(
        'Cannot compare different dashboard statistics types',
      );
    }

    const percentageChange: AllocatorsDashboardStatistic['percentageChange'] =
      (() => {
        if (!previousValue.value) {
          return null;
        }

        const ratio =
          currentValue.type === 'bigint' || previousValue.type === 'bigint'
            ? bigIntDiv(
                BigInt(currentValue.value),
                BigInt(previousValue.value),
                2,
              )
            : currentValue.value / previousValue.value;

        return {
          value: ratio - 1,
          interval,
        };
      })();

    return {
      type,
      title: dashboardStatisticsTitleDict[type],
      description: dashboardStatisticsDescriptionDict[type],
      value: currentValue,
      percentageChange,
    };
  }
}
