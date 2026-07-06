import { Cache, CACHE_MANAGER, CacheTTL } from '@nestjs/cache-manager';
import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Query,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { DateTime } from 'luxon';
import {
  PoRepDealState,
  Prisma,
  StorageProviderUrlFinderMetricType,
} from 'prisma/generated/client';
import { PrismaService } from 'src/db/prisma.service';
import { PoRepService } from 'src/service/po-rep/po-rep.service';
import {
  PoRepActiveClientsHistoryEntry,
  PoRepActiveClientsHistoryParameters,
  PoRepDealsList,
  PoRepDealsListParameters,
  PoRepDealsPaymentsHistoryEntry,
  PoRepDealsValueHistoryEntry,
  PoRepHistoryParameters,
  PoRepOnboardedDataHistoryEntry,
  PoRepOnboardedDataHistoryParameters,
  PoRepProviderComplianceStatistics,
  PoRepProviderStorageStatistics,
  PoRepSLIComplianceHistoryEntry,
  PoRepSLIComplianceHistoryParameters,
  PoRepSLIType,
  poRepSLITypes,
} from 'src/service/po-rep/types.po-rep';
import { bigIntDiv, BigIntString, F0Id, stringToBool } from 'src/utils/utils';
import { ControllerBase } from '../base/controller-base';
import {
  DashboardStatistic,
  DashboardStatisticValue,
} from '../base/types.controller-base';
import {
  GetPoRepProvidersResponse,
  GetPoRepStatisticsRequest,
  PoRepDashboardStatistic,
  PoRepDashboardStatisticType,
  PoRepProviderResourceParameters,
  PoRepProviderSLIInfo,
  PoRepProvidersListParameters,
  PoRepSLIMeasurment,
} from './types.po-rep';

const sliTypesMap: Record<
  PoRepSLIType,
  StorageProviderUrlFinderMetricType | null
> = {
  retrievabilityBps: StorageProviderUrlFinderMetricType.RPA_RETRIEVABILITY,
  bandwidthMbps: StorageProviderUrlFinderMetricType.BANDWIDTH,
  latencyMs: StorageProviderUrlFinderMetricType.TTFB,
  indexingPct: null,
};

const dashboardStatisticsTitleDict: Record<
  PoRepDashboardStatisticType,
  PoRepDashboardStatistic['title']
> = {
  TOTAL_DEALS_DONE: 'Total Deals Done',
  TOTAL_USD_PAID: 'Total USD Paid Out',
  TOTAL_DATA_ONBOARDED: 'Total Data Onboarded',
  TOTAL_DEALS_VALUE: 'Predicted ARR',
  ACTIVE_CLIENTS_COUNT: 'Active Clients Count',
};

const dashboardStatisticsDescriptionDict: Record<
  PoRepDashboardStatisticType,
  PoRepDashboardStatistic['description']
> = {
  TOTAL_DEALS_DONE: 'Total count of deals done up to date',
  TOTAL_USD_PAID:
    'Total amount in USD of funds transferred to providers for fulfilling deals',
  TOTAL_DATA_ONBOARDED: 'Total volume of deals data onboarded',
  TOTAL_DEALS_VALUE:
    'Total USD value locked in accepted deals, assuming they will not be terminated early',
  ACTIVE_CLIENTS_COUNT:
    'Number of unique clients with at least one ongoing deal',
};

@Controller('po-rep')
export class PoRepController extends ControllerBase {
  constructor(
    @Inject(CACHE_MANAGER) private _cacheManager: Cache,
    private readonly prismaService: PrismaService,
    private readonly poRepService: PoRepService,
  ) {
    super();
  }

  @Get('/statistics')
  @ApiOperation({
    summary: 'Get list of statistics regarding PoRep market',
  })
  @ApiOkResponse({
    description: 'List of statistics regarding PoRep market',
    type: [PoRepDashboardStatistic],
  })
  @CacheTTL(1000 * 60 * 5) // 5 minutes
  public async getStatistics(
    @Query() query: GetPoRepStatisticsRequest,
  ): Promise<PoRepDashboardStatistic[]> {
    const { interval = 'day' } = query;
    const cutoffDate = DateTime.now()
      .toUTC()
      .minus({ [interval]: 1 });

    const [
      currentDealsCount,
      previousDealsCount,
      onboardedDataHistory,
      dealsValueHistory,
      paymentsHistory,
      activeClientsHistory,
    ] = await Promise.all([
      this.poRepService.getDealsDoneCountUpToDate(),
      this.poRepService.getDealsDoneCountUpToDate(cutoffDate.toJSDate()),
      this.poRepService.getOnboardedDataHistory({ windowSize: interval }),
      this.poRepService.getDealsValueHistory({ windowSize: interval }),
      this.poRepService.getDealsPaymentsSummaryHistory({
        windowSize: interval,
      }),
      this.poRepService.getActiveClientsHistory({ windowSize: interval }),
    ]);

    const currentPaymentsEntry = paymentsHistory.at(-1);
    const comparedPaymentsEntry = paymentsHistory.at(-2);
    const currentOnboardedDataEntry = onboardedDataHistory.at(-1);
    const comparedOnboardedDataEntry = onboardedDataHistory.at(-2);
    const currentDealsValueEntry = dealsValueHistory.at(-1);
    const comparedDealsValueEntry = dealsValueHistory.at(-2);
    const currentActiveClientsEntry = activeClientsHistory.at(-1);
    const comparedActiveClientsEntry = activeClientsHistory.at(-2);

    return [
      this.calculateDashboardStatistic({
        type: 'TOTAL_DEALS_DONE',
        interval: interval,
        currentValue: {
          value: currentDealsCount,
          type: 'numeric',
        },
        previousValue: {
          value: previousDealsCount,
          type: 'numeric',
        },
      }),
      this.calculateDashboardStatistic({
        type: 'TOTAL_DATA_ONBOARDED',
        interval: interval,
        currentValue: {
          value:
            (currentOnboardedDataEntry?.cumulativeTotal.toString() as BigIntString) ??
            '0',
          type: 'bigint',
        },
        previousValue: {
          value:
            (comparedOnboardedDataEntry?.cumulativeTotal.toString() as BigIntString) ??
            '0',
          type: 'bigint',
        },
      }),
      this.calculateDashboardStatistic({
        type: 'TOTAL_DEALS_VALUE',
        interval: interval,
        currentValue: {
          value: currentDealsValueEntry?.cumulativeTotalUSD ?? 0,
          type: 'numeric',
        },
        previousValue: {
          value: comparedDealsValueEntry?.cumulativeTotalUSD ?? 0,
          type: 'numeric',
        },
      }),
      this.calculateDashboardStatistic({
        type: 'TOTAL_USD_PAID',
        interval: interval,
        currentValue: {
          value: currentPaymentsEntry?.cumulativeTotalUSD ?? 0,
          type: 'numeric',
        },
        previousValue: {
          value: comparedPaymentsEntry?.cumulativeTotalUSD ?? 0,
          type: 'numeric',
        },
      }),
      this.calculateDashboardStatistic({
        type: 'ACTIVE_CLIENTS_COUNT',
        interval: interval,
        currentValue: {
          value: currentActiveClientsEntry?.activeClientsCount ?? 0,
          type: 'numeric',
        },
        previousValue: {
          value: comparedActiveClientsEntry?.activeClientsCount ?? 0,
          type: 'numeric',
        },
      }),
    ];
  }

  @Get('/providers')
  @ApiOperation({
    summary: 'Get list of storage providers participating in PoRep market',
  })
  @ApiOkResponse({
    description: 'List of storage providers participating in PoRep market',
    type: GetPoRepProvidersResponse,
  })
  @CacheTTL(1000 * 60 * 30) // 30 minutes
  public async getParticipants(
    @Query(new ValidationPipe()) query: PoRepProvidersListParameters,
  ): Promise<GetPoRepProvidersResponse> {
    const { filter } = query;
    const paginationInfo = this.validatePaginationInfo(query);
    const showActive = stringToBool(query.showActive);

    const where = {
      AND: [
        filter ? { providerId: F0Id.from(filter).toBigInt() } : {},
        showActive !== null
          ? {
              [showActive ? 'AND' : 'OR']: [
                { paused: !showActive },
                { blocked: !showActive },
              ],
            }
          : {},
      ],
    } satisfies Prisma.po_rep_storage_providerWhereInput;

    const [providers, totalCount] = await this.prismaService.$transaction([
      this.prismaService.po_rep_storage_provider.findMany({
        ...this.validateQueryPagination(paginationInfo),
        include: {
          capabilities: true,
          _count: {
            select: {
              deals: {
                where: {
                  state: {
                    in: [PoRepDealState.ACCEPTED, PoRepDealState.COMPLETED],
                  },
                },
              },
            },
          },
        },
        where: where,
        orderBy:
          showActive === null
            ? [
                { paused: 'asc' },
                { blocked: 'asc' },
                { registeredAtBlock: 'desc' },
              ]
            : [
                {
                  registeredAtBlock: 'desc',
                },
              ],
      }),
      this.prismaService.po_rep_storage_provider.count({ where: where }),
    ]);

    if (providers.length === 0) {
      return this.withPaginationInfo(
        {
          data: [],
        },
        query,
        totalCount,
      );
    }

    const providersIds = providers.map((provider) => {
      return 'f0' + provider.providerId.toString();
    });

    interface LatestMetric {
      provider: string;
      value: number | null;
      tested_at: Date;
      metric_type: string;
    }

    const latestMetrics = await this.prismaService.$queryRaw<LatestMetric[]>`
      WITH "latest_metrics" AS (
        SELECT *, ROW_NUMBER() OVER(PARTITION BY "provider", "metric_type" ORDER BY "tested_at" DESC) as "rn"
        FROM "storage_provider_url_finder_metric_value"
        LEFT JOIN "storage_provider_url_finder_metric" ON "storage_provider_url_finder_metric"."id" = "storage_provider_url_finder_metric_value"."metric_id"
      )
      SELECT "provider", "value", "tested_at", "metric_type" FROM "latest_metrics" WHERE "rn" <= 3 AND "provider" IN (${Prisma.join(providersIds)})
    `;

    const data = providers.map((provider) => {
      const providerId = 'f0' + provider.providerId.toString();
      const slis: PoRepProviderSLIInfo[] = poRepSLITypes.map((sliType) => {
        const measuredValues: PoRepSLIMeasurment[] = latestMetrics
          .filter((measurement) => {
            return (
              measurement.provider === providerId &&
              measurement.metric_type === sliTypesMap[sliType]
            );
          })
          .map((measurement): PoRepSLIMeasurment | null => {
            if (measurement.value === null) {
              return null;
            }

            return {
              date: measurement.tested_at.toISOString(),
              value:
                measurement.metric_type ===
                StorageProviderUrlFinderMetricType.RPA_RETRIEVABILITY
                  ? measurement.value * 10000 // Convert percentage to basic points
                  : measurement.value,
            };
          })
          .filter((maybeSLIInfo): maybeSLIInfo is PoRepSLIMeasurment => {
            return maybeSLIInfo !== null;
          });

        return {
          type: sliType,
          declaredValue: provider.capabilities[sliType],
          measuredValues: measuredValues,
        };
      });

      return {
        providerId: providerId,
        paused: provider.paused,
        blocked: provider.blocked,
        availableBytes: provider.availableBytes.toString(),
        committedBytes: provider.committedBytes.toString(),
        pendingBytes: provider.pendingBytes.toString(),
        minDealDurationDays: provider.minDealDurationDays,
        maxDealDurationDays: provider.maxDealDurationDays,
        activeDealsCount: provider._count.deals,
        slis: slis,
        registeredAtBlock: provider.registeredAtBlock.toString(),
      };
    });

    return this.withPaginationInfo(
      {
        data: data,
      },
      query,
      totalCount,
    );
  }

  @Get('/providers/:providerId/compliance-stats')
  @ApiOperation({
    summary: 'Get po-rep compliance statistics for given provider id.',
  })
  @ApiOkResponse({
    description: 'Po-rep provider compliance statistics',
    type: PoRepProviderComplianceStatistics,
  })
  @ApiBadRequestResponse({
    description: 'Error response when invalid provider id is given.',
  })
  @ApiNotFoundResponse({
    description: 'Error response when provider with given id does not exist.',
  })
  public async getProviderComplianceStatistics(
    @Param(new ValidationPipe())
    parameters: PoRepProviderResourceParameters,
  ): Promise<PoRepProviderComplianceStatistics> {
    const provider = await this.prismaService.po_rep_storage_provider.findFirst(
      {
        where: {
          providerId: F0Id.from(parameters.providerId).toBigInt(),
        },
      },
    );

    if (!provider) {
      throw new NotFoundException(
        `Po-rep provider with ID "${parameters.providerId}" does not exist.`,
      );
    }

    const result = await this.poRepService.getProviderComplianceStatistics(
      parameters.providerId,
    );

    return result;
  }

  @Get('/providers/:providerId/storage-stats')
  @ApiOperation({
    summary: 'Get po-rep storage statistics for given provider id.',
  })
  @ApiOkResponse({
    description: 'Po-rep provider storage statistics',
    type: PoRepProviderStorageStatistics,
  })
  @ApiBadRequestResponse({
    description: 'Error response when invalid provider id is given.',
  })
  @ApiNotFoundResponse({
    description: 'Error response when provider with given id does not exist.',
  })
  public async getProviderStorageStatistics(
    @Param(new ValidationPipe())
    parameters: PoRepProviderResourceParameters,
  ): Promise<PoRepProviderStorageStatistics> {
    const stats = await this.poRepService.getProviderStorageStatistics(
      parameters.providerId,
    );

    if (!stats) {
      throw new NotFoundException(
        `Po-rep provider with ID "${parameters.providerId}" does not exist.`,
      );
    }

    return stats;
  }

  @Get('/deals')
  @UseInterceptors(ClassSerializerInterceptor)
  @ApiOkResponse({
    type: PoRepDealsList,
  })
  public getDeals(
    @Query(new ValidationPipe({ transform: true }))
    query: PoRepDealsListParameters,
  ): Promise<PoRepDealsList> {
    return this.poRepService.getDeals(query);
  }

  @Get('/onboarded-data-history')
  @ApiOperation({
    summary: 'Get the history of onboarded data for PoRep deals',
  })
  @ApiOkResponse({
    type: [PoRepOnboardedDataHistoryEntry],
  })
  // @CacheTTL(1000 * 60 * 30) // 30 minutes
  public async getOnboardedDataHistory(
    @Query(new ValidationPipe()) query: PoRepOnboardedDataHistoryParameters,
  ): Promise<PoRepOnboardedDataHistoryEntry[]> {
    return this.poRepService.getOnboardedDataHistory(query);
  }

  @Get('/deals-value-history')
  @ApiOperation({
    summary: 'Get the history of PoRep deals value',
  })
  @ApiOkResponse({
    type: [PoRepDealsValueHistoryEntry],
  })
  @CacheTTL(1000 * 60 * 30) // 30 minutes
  public async getDealsValueHistory(
    @Query(new ValidationPipe()) query: PoRepHistoryParameters,
  ): Promise<PoRepDealsValueHistoryEntry[]> {
    return this.poRepService.getDealsValueHistory(query);
  }

  @Get('/payments-history')
  @ApiOperation({
    summary:
      'Get the history of USD amounts paid to providers for deal settlements',
  })
  @ApiOkResponse({
    type: [PoRepDealsPaymentsHistoryEntry],
  })
  @CacheTTL(1000 * 60 * 30) // 30 minutes
  public async getPaymentsHistory(
    @Query(new ValidationPipe()) query: PoRepHistoryParameters,
  ): Promise<PoRepDealsPaymentsHistoryEntry[]> {
    return this.poRepService.getDealsPaymentsSummaryHistory(query);
  }

  @Get('/sli-compliance-history')
  @ApiOperation({
    summary:
      'Get the history of deals SLI compliance, optionally filtered by SLI, Provider ID or Deal ID',
  })
  @ApiOkResponse({
    type: [PoRepSLIComplianceHistoryEntry],
    description:
      'Breakdown by state, in provided windows, matching given filters',
  })
  @ApiBadRequestResponse({
    description: 'Query parameters validation error',
  })
  @CacheTTL(1000 * 60 * 30) // 30 minutes
  public async getSLIComplianceHistory(
    @Query(new ValidationPipe()) query: PoRepSLIComplianceHistoryParameters,
  ): Promise<PoRepSLIComplianceHistoryEntry[]> {
    return this.poRepService.getSLIComplianceHistory(query);
  }

  @Get('/active-clients-history')
  @ApiOperation({
    summary:
      'Get the history of active clients count, optionally filtered by Provider ID',
  })
  @ApiOkResponse({
    type: [PoRepActiveClientsHistoryEntry],
    description:
      'Active clients count in provided windows, matching given filters',
  })
  @ApiBadRequestResponse({
    description: 'Query parameters validation error',
  })
  @ApiNotFoundResponse({
    description: 'Error when provider specified in filters does not exist',
  })
  @CacheTTL(1000 * 60 * 30) // 30 minutes
  public async getActiveClientsHistory(
    @Query(new ValidationPipe()) query: PoRepActiveClientsHistoryParameters,
  ): Promise<PoRepActiveClientsHistoryEntry[]> {
    const providerId =
      query.providerId !== null && query.providerId !== undefined
        ? F0Id.from(query.providerId)
        : null;

    if (providerId) {
      const provider =
        await this.prismaService.po_rep_storage_provider.findFirst({
          where: {
            providerId: providerId.toBigInt(),
          },
        });

      if (!provider) {
        throw new NotFoundException(
          `Po-Rep Provider with ID "${providerId.toString()}" does not exist`,
        );
      }
    }

    return this.poRepService.getActiveClientsHistory(query);
  }

  private calculateDashboardStatistic(options: {
    type: PoRepDashboardStatistic['type'];
    currentValue: DashboardStatisticValue;
    previousValue: DashboardStatisticValue;
    interval: DashboardStatistic['percentageChange']['interval'];
  }): PoRepDashboardStatistic {
    const { type, currentValue, previousValue, interval } = options;

    if (currentValue.type !== previousValue.type) {
      throw new TypeError(
        'Cannot compare different dashboard statistics types',
      );
    }

    const percentageChange: PoRepDashboardStatistic['percentageChange'] =
      (() => {
        const dividerIsZero =
          previousValue.type === 'bigint'
            ? BigInt(previousValue.value) === 0n
            : previousValue.value === 0;
        if (dividerIsZero) return null;

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
          interval: interval,
          increaseNegative: false,
        };
      })();

    return {
      type: type,
      title: dashboardStatisticsTitleDict[type],
      description: dashboardStatisticsDescriptionDict[type],
      value: currentValue,
      percentageChange: percentageChange,
    };
  }
}
