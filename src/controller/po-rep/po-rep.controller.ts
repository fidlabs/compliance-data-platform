import { Cache, CACHE_MANAGER, CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, Inject, Query, ValidationPipe } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { groupBy } from 'lodash';
import { DateTime } from 'luxon';
import {
  PoRepDealState,
  Prisma,
  StorageProviderUrlFinderMetricType,
} from 'prisma/generated/client';
import { Decimal } from 'prisma/generated/client/runtime/index-browser';
import { PrismaService } from 'src/db/prisma.service';
import {
  PoRepService,
  SLIComplianceHistoryParameters,
} from 'src/service/po-rep/po-rep.service';
import { bigIntDiv, safeDiv } from 'src/utils/utils';
import { ControllerBase } from '../base/controller-base';
import {
  DashboardStatistic,
  DashboardStatisticValue,
  PaginationInfoRequest,
} from '../base/types.controller-base';
import {
  GetPoRepProvidersResponse,
  GetPoRepStatisticsRequest,
  PoRepDashboardStatistic,
  PoRepDashboardStatisticType,
  PoRepDealsPaymentsHistoryEntry,
  PoRepDealsValueHistoryEntry,
  PoRepHistoryRequest,
  PoRepOnboardedDataHistoryEntry,
  PoRepProviderSLIInfo,
  PoRepSLIComplianceHistoryEntry,
  PoRepSLIComplianceHistoryParamters,
  PoRepSLIMeasurment,
  PoRepSLIType,
  poRepSLITypes,
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
};

const dashboardStatisticsDescriptionDict: Record<
  PoRepDashboardStatisticType,
  PoRepDashboardStatistic['description']
> = {
  TOTAL_DEALS_DONE: 'Total count of deals done up to date',
  TOTAL_USD_PAID:
    'Total amount in USD of funds transferred to providers for fulfilling deals',
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

    const [currentDealsCount, previousDealsCount, paymentsHistory] =
      await Promise.all([
        this.poRepService.getDealsDoneCountUpToDate(),
        this.poRepService.getDealsDoneCountUpToDate(cutoffDate.toJSDate()),
        this.poRepService.getDealsPaymentsSummaryHistory(interval),
      ]);

    const currentPaymentsEntry = paymentsHistory.at(-1);
    const comparedPaymentsEntry = paymentsHistory.at(-2);

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
    @Query() query: PaginationInfoRequest,
  ): Promise<GetPoRepProvidersResponse> {
    const paginationInfo = this.validatePaginationInfo(query);
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
        orderBy: {
          registeredAtBlock: 'desc',
        },
      }),
      this.prismaService.po_rep_storage_provider.count(),
    ]);

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

  @Get('/onboarded-data-history')
  @ApiOperation({
    summary: 'Get the history of onboarded data for PoRep deals',
  })
  @ApiOkResponse({
    type: [PoRepOnboardedDataHistoryEntry],
  })
  @CacheTTL(1000 * 60 * 30) // 30 minutes
  public async getOnboardedDataHistory(
    @Query(new ValidationPipe()) query: PoRepHistoryRequest,
  ): Promise<PoRepOnboardedDataHistoryEntry[]> {
    const { windowSize = 'day' } = query;
    const results = await this.poRepService.getOnboardedDataHistory(windowSize);

    return results.map<PoRepOnboardedDataHistoryEntry>((result) => {
      return {
        date: result.date.toFormat('yyyy-MM-dd'),
        volume: result.volume.toString(),
        cumulativeTotal: result.cumulativeTotal.toString(),
      };
    });
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
    @Query(new ValidationPipe()) query: PoRepHistoryRequest,
  ): Promise<PoRepDealsValueHistoryEntry[]> {
    const { windowSize = 'day' } = query;
    const results = await this.poRepService.getDealsValueHistory(windowSize);

    return results.map<PoRepDealsValueHistoryEntry>((result) => {
      return {
        date: result.date.toFormat('yyyy-MM-dd'),
        volumeUSD: result.volumeUSD,
        cumulativeTotalUSD: result.cumulativeTotalUSD,
      };
    });
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
    @Query(new ValidationPipe()) query: PoRepHistoryRequest,
  ): Promise<PoRepDealsPaymentsHistoryEntry[]> {
    const { windowSize = 'day' } = query;
    const results =
      await this.poRepService.getDealsPaymentsSummaryHistory(windowSize);

    return results.map((result) => {
      return {
        date: result.date.toFormat('yyyy-MM-dd'),
        dailyAmountUSD: result.volumeUSD,
        cumulativeAmountUSD: result.cumulativeTotalUSD,
      };
    });
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
    @Query(new ValidationPipe()) query: PoRepSLIComplianceHistoryParamters,
  ): Promise<PoRepSLIComplianceHistoryEntry[]> {
    const { windowSize = 'day', sliType, providerId, dealId } = query;
    const results = await this.poRepService.getSLIComplianceHistory({
      windowSize: windowSize,
      sliType: this.mapSLIType(sliType),
      providerId: providerId ? BigInt(providerId) : null,
      dealId: dealId ? BigInt(dealId) : null,
    });

    const grouped = groupBy(results, (result) =>
      result.window_start.toISOString(),
    );

    const states = [
      'compliant',
      'nonCompliant',
      'unknown',
    ] as const satisfies Omit<keyof PoRepSLIComplianceHistoryEntry, 'date'>[];

    return Object.entries(grouped)
      .slice(0, -1)
      .map<PoRepSLIComplianceHistoryEntry>(([dateISOString, results]) => {
        const [totalProvidersCount, totalDealsCount, totalDealsSize] =
          results.reduce(
            (totals, result) => {
              return [
                totals[0] + result.providers_count,
                totals[1] + result.deals_count,
                totals[2].add(result.total_deals_size),
              ];
            },
            [0, 0, Decimal(0)],
          );

        const stateEntries = states.map((state) => {
          const stateResult = results.find(
            (c) => c.compliance_state.toLowerCase() === state.toLowerCase(),
          );

          if (!stateResult) {
            return [
              state,
              {
                providersCount: 0,
                providersPercentage: 0,
                dealsCount: 0,
                dealsPercentage: 0,
                totalDealsSize: '0',
                totalDealsSizePercentage: 0,
              },
            ];
          }

          return [
            state,
            {
              providersCount: stateResult.providers_count,
              providersPercentage: safeDiv(
                stateResult.providers_count,
                totalProvidersCount,
                0,
              ),
              dealsCount: stateResult.deals_count,
              dealsPercentage: safeDiv(
                stateResult.deals_count,
                totalDealsCount,
                0,
              ),
              totalDealsSize: stateResult.total_deals_size.toString(),
              totalDealsSizePercentage: totalDealsSize.eq(0)
                ? 0
                : stateResult.total_deals_size.div(totalDealsSize).toNumber(),
            },
          ] as const;
        });

        return {
          date: DateTime.fromISO(dateISOString, { zone: 'UTC' }).toFormat(
            'yyyy-MM-dd',
          ),
          ...(Object.fromEntries(stateEntries) as Omit<
            PoRepSLIComplianceHistoryEntry,
            'date'
          >),
        };
      });
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

  private mapSLIType(
    poRepSLIType: PoRepSLIType | undefined,
  ): SLIComplianceHistoryParameters['sliType'] {
    switch (poRepSLIType) {
      case 'bandwidthMbps':
        return 'BANDWIDTH';
      case 'indexingPct':
        return null; // Not measured
      case 'latencyMs':
        return 'TTFB';
      case 'retrievabilityBps':
        return 'RPA_RETRIEVABILITY';
    }
  }
}
