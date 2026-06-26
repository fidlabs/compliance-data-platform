import { Inject, Injectable } from '@nestjs/common';
import { groupBy, uniq } from 'lodash';
import { DateTime } from 'luxon';
import {
  PoRepDealState,
  StorageProviderUrlFinderMetricType,
} from 'prisma/generated/client';
import { Decimal } from 'prisma/generated/client/runtime/library';
import {
  getFilecoinPaymentsForDealsHistory,
  getPoRepActiveClientsHistory,
  getPoRepDealsValueHistory,
  getPoRepOnboardedDataHistory,
  getPoRepSLIComplianceHistory,
} from 'prisma/generated/client/sql';
import { PrismaService } from 'src/db/prisma.service';
import { createPoRepDealsQuery } from 'src/db/queries/po-rep-deals.query';
import { PoRepPublicClient, RECENT_NODE_CLIENT } from 'src/po-rep-indexer';
import {
  dateToFilecoinBlockHeight,
  F0Id,
  filecoinBlockHeightToDate,
  safeDiv,
  stringToBool,
  stringToNumber,
} from 'src/utils/utils';
import { F0IdInput } from 'src/utils/validators';
import { filecoinCalibration } from 'viem/chains';
import { ERC20TokenInfoService } from '../erc20-token-info/erc20-token-info.service';
import { PoRepPriceOracleService } from '../po-rep-price-oracle/po-rep-price-oracle.service';
import {
  DealRailState,
  PoRepActiveClientsHistoryEntry,
  PoRepActiveClientsHistoryParameters,
  PoRepDeal,
  PoRepDealsList,
  PoRepDealsListParameters,
  PoRepDealsPaymentsHistoryEntry,
  PoRepDealsValueHistoryEntry,
  PoRepHistoryParameters,
  PoRepOnboardedDataHistoryEntry,
  PoRepProviderComplianceStatistics,
  PoRepSLIComplianceHistoryEntry,
  PoRepSLIComplianceHistoryParameters,
  PoRepSLIType,
} from './types.po-rep';
import { InjectQueryBuilder, QueryBuilder } from 'src/db';

@Injectable()
export class PoRepService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly tokenInfoService: ERC20TokenInfoService,
    private readonly priceOracle: PoRepPriceOracleService,
    @Inject(RECENT_NODE_CLIENT)
    private readonly recentNodeClient: PoRepPublicClient,
    @InjectQueryBuilder() private readonly queryBuilder: QueryBuilder,
  ) {}

  public async getDeals({
    providerId = null,
    railState = null,
    activeOnly,
    sort = null,
    order = 'asc',
    limit = 0,
    page = 1,
  }: PoRepDealsListParameters): Promise<PoRepDealsList> {
    const baseQuery = createPoRepDealsQuery(this.queryBuilder, {
      providersIds: providerId,
      railStates: railState,
      activeOnly: Boolean(stringToBool(activeOnly)),
    });

    let resultsQuery = baseQuery.selectAll();

    if (sort !== null) {
      resultsQuery = resultsQuery.orderBy(sort, order);
    }

    if (limit) {
      resultsQuery = resultsQuery.limit(limit).offset((page - 1) * limit);
    }

    const countQuery = baseQuery.select((eb) => [
      eb.fn.count('deal_data.deal_id').as('count'),
    ]);

    const [results, countResult] = await Promise.all([
      resultsQuery.execute(),
      countQuery.executeTakeFirstOrThrow(),
    ]);

    const totalCount = stringToNumber(countResult.count.toString());
    const pagesCount = limit ? totalCount / limit : 1;

    const uniqueTokens = uniq(
      results.map((result) => result.token_address),
    ).filter((tokenAddress) => tokenAddress !== null);
    const tokenDetailsRequests = uniqueTokens.map(async (tokenAddress) => {
      const [tokenSymbol, tokenDecimals] = await Promise.all([
        this.tokenInfoService.getTokenSymbol(tokenAddress),
        this.tokenInfoService.getTokenDecimals(tokenAddress),
      ]);

      return [
        tokenAddress,
        { tokenSymbol: tokenSymbol, tokenDecimals: tokenDecimals },
      ] as const;
    });

    const tokenDetailsResponses = await Promise.all(tokenDetailsRequests);
    const tokenDetailsMap = new Map(tokenDetailsResponses);

    const deals = results.map((result) => {
      const tokenDetails = result.token_address
        ? tokenDetailsMap.get(result.token_address)
        : null;

      return new PoRepDeal({
        dealId: BigInt(result.deal_id),
        providerId: F0Id.from(result.provider_id),
        clientAddress: result.client_address,
        dealState: result.deal_state,
        railId: result.rail_id ? BigInt(result.rail_id) : null,
        railState: result.rail_state as DealRailState | null,
        active: Boolean(result.active),
        tokenAddress: result.token_address,
        tokenSymbol: tokenDetails?.tokenSymbol ?? null,
        tokenDecimals: tokenDetails?.tokenDecimals ?? null,
        minRequiredRetrievability: this.safeNumericToNumber(
          result.min_required_retrievability,
        ),
        minRequiredBandwidthMbps: this.safeNumericToNumber(
          result.min_required_bandwidth_mbps,
        ),
        maxRequiredLatencyMs: this.safeNumericToNumber(
          result.max_required_latency_ms,
        ),
        minRequiredIndexing: this.safeNumericToNumber(
          result.min_required_indexing,
        ),
        predictedAverageRetrievability: this.safeNumericToNumber(
          result.predicted_average_retrievability,
        ),
        predictedAverageBandwidthMbps: this.safeNumericToNumber(
          result.predicted_average_bandwidth,
        ),
        predictedAverageLatencyMs: this.safeNumericToNumber(
          result.predicted_average_latency,
        ),
        predictedAverageIndexing: this.safeNumericToNumber(
          result.predicted_average_indexing,
        ),
        dealSizeBytes: BigInt(result.deal_size_bytes),
        isDataOnboarded: result.rail_activated_at_epoch !== null,
        pricePerSectorPerMonthWei: BigInt(result.price_per_sector_per_month),
        predictedDealRevenueWei: BigInt(result.predicted_deal_revenue),
        totalSettledValueWei: result.total_amount_settled
          ? BigInt(result.total_amount_settled)
          : null,
        settlementsCount: result.total_settlements_count,
        lastSettlementAt:
          result.last_settlement_epoch !== null
            ? this.epochToDate(BigInt(result.last_settlement_epoch))
            : null,
        dealCreatedAtEpoch: BigInt(result.deal_created_at_epoch),
        dealCreatedAt: this.epochToDate(BigInt(result.deal_created_at_epoch)),
      });
    });

    return {
      data: deals,
      pagination: {
        page: page ?? 1,
        pagesCount: pagesCount,
        totalCount: totalCount,
      },
    };
  }

  public async getProviderComplianceStatistics(
    providerId: F0Id | F0IdInput,
  ): Promise<PoRepProviderComplianceStatistics> {
    // We calculate statistics in memory from all provider deals, because
    // constructing a query for it would be a PITA and the performance gain is
    // minimal. This should not be a problem in a forseeable future as we don't
    // expect provider to have that many deals.
    const providerDeals = await this.getDeals({
      providerId: F0Id.from(providerId).toBigInt(),
    });

    type PartialStats = Omit<
      PoRepProviderComplianceStatistics,
      'compliantDealsPercentage'
    >;

    const initialState: PartialStats = {
      totalDealsCount: 0,
      activeDealsCount: 0,
      compliantDealsCount: 0,
      nonCompliantDealsCount: 0,
      unknownDealsCount: 0,
    };

    const partialStats = providerDeals.data.reduce<PartialStats>(
      (currentResult, deal) => {
        const dealActive =
          deal.dealState === PoRepDealState.COMPLETED &&
          (deal.railState === DealRailState.ACTIVE ||
            deal.railState === DealRailState.TERMINATED);

        if (!dealActive) {
          return {
            ...currentResult,
            totalDealsCount: currentResult.totalDealsCount + 1,
          };
        }

        const sliPairs: [
          requiredValue: number | null,
          predictedValue: number | null,
          reverseCheck: boolean,
        ][] = [
          [
            deal.minRequiredRetrievability,
            deal.predictedAverageRetrievability,
            false,
          ],
          [
            deal.minRequiredBandwidthMbps,
            deal.predictedAverageBandwidthMbps,
            false,
          ],
          [deal.maxRequiredLatencyMs, deal.predictedAverageLatencyMs, true],
          [deal.minRequiredIndexing, deal.predictedAverageIndexing, false],
        ];

        const stateUnknown = sliPairs.some(
          ([requiredValue, predictedValue]) => {
            return requiredValue !== null && predictedValue === null;
          },
        );

        const compliant = sliPairs.every(
          ([requiredValue, predictedValue, reverseCheck]) => {
            if (requiredValue === null) {
              return true;
            }

            if (predictedValue === null) {
              return false;
            }

            return reverseCheck
              ? predictedValue <= requiredValue
              : predictedValue >= requiredValue;
          },
        );

        return {
          totalDealsCount: currentResult.totalDealsCount + 1,
          activeDealsCount: currentResult.activeDealsCount + 1,
          compliantDealsCount: compliant
            ? currentResult.compliantDealsCount + 1
            : currentResult.compliantDealsCount,
          nonCompliantDealsCount:
            !compliant && !stateUnknown
              ? currentResult.nonCompliantDealsCount + 1
              : currentResult.nonCompliantDealsCount,
          unknownDealsCount: stateUnknown
            ? currentResult.unknownDealsCount + 1
            : currentResult.unknownDealsCount,
        };
      },
      initialState,
    );

    const successRate =
      partialStats.activeDealsCount > 0
        ? partialStats.compliantDealsCount / partialStats.activeDealsCount
        : null;

    return {
      ...partialStats,
      compliantDealsPercentage: successRate,
    };
  }

  public async getDealsPaymentsSummaryHistory({
    windowSize = 'day',
  }: PoRepHistoryParameters): Promise<PoRepDealsPaymentsHistoryEntry[]> {
    const earliestDeal = await this.prismaService.po_rep_deal.findFirst({
      orderBy: {
        proposedAtBlock: 'asc',
      },
    });

    if (!earliestDeal) {
      return [];
    }

    const startDate = DateTime.fromJSDate(
      // eslint-disable-next-line no-restricted-syntax
      filecoinBlockHeightToDate(Number(earliestDeal.proposedAtBlock), {
        testnet: this.isTestnet(),
      }),
    )
      .toUTC()
      .startOf(windowSize);
    const endDate = DateTime.utc().startOf(windowSize);
    const entriesCount =
      endDate.diff(startDate, windowSize)[`${windowSize}s`] + 1;
    const data = await this.prismaService.$queryRawTyped(
      getFilecoinPaymentsForDealsHistory(windowSize, this.isTestnet()),
    );

    interface Token {
      address: string;
      symbol: string;
      decimals: number;
    }

    const uniqueTokens = uniq(data.map((item) => item.token_address));

    const tokenExchangeRateRequests = uniqueTokens.map((tokenAddress) => {
      return Promise.all([
        tokenAddress,
        this.priceOracle.getTokenExchangeRateUSD(tokenAddress),
      ]);
    });
    const tokenExchangeRateResponses = await Promise.all(
      tokenExchangeRateRequests,
    );
    const tokensUSDExchangeRates = new Map(tokenExchangeRateResponses);

    const tokenInfoRequests = uniqueTokens.map((tokenAddress) => {
      return Promise.all([
        tokenAddress,
        this.tokenInfoService.getTokenSymbol(tokenAddress),
        this.tokenInfoService.getTokenDecimals(tokenAddress),
      ]);
    });
    const tokenInfoResponses = await Promise.all(tokenInfoRequests);
    const tokensInfo = tokenInfoResponses.reduce((result, tokenInfo) => {
      const [address, symbol, decimals] = tokenInfo;
      return result.set(address, {
        address: address,
        symbol: symbol,
        decimals: decimals,
      });
    }, new Map<string, Token>());

    const dataByWindow = groupBy(
      data.filter((item) => item.window_start !== null),
      (item) =>
        DateTime.fromJSDate(item.window_start, { zone: 'UTC' }).toISODate(),
    );

    return [...new Array(entriesCount)].reduce<
      PoRepDealsPaymentsHistoryEntry[]
    >((result, _, index) => {
      const entryDate = startDate.plus({ [windowSize]: index });
      const entryISODate = entryDate.toISODate();
      const dataForWindow = dataByWindow[entryISODate] ?? [];

      const windowVolumeUSD = dataForWindow.reduce(
        (currentWindowVolumeUSD, result) => {
          const tokenUSDExchangeRate = tokensUSDExchangeRates.get(
            result.token_address,
          );
          const tokenInfo = tokensInfo.get(result.token_address);

          // Should not happen but type safety
          if (!tokenUSDExchangeRate || !tokenInfo) {
            throw new Error(
              `Exchange rate or info not found for token "${result.token_address}"`,
            );
          }

          const tokenExponent = Math.pow(10, tokenInfo.decimals);
          const tokenWindowTotalUSD = result.window_total
            .div(tokenExponent)
            .mul(tokenUSDExchangeRate);

          return currentWindowVolumeUSD.add(tokenWindowTotalUSD);
        },
        Decimal(0),
      );

      const previousEntry = index === 0 ? undefined : result.at(index - 1);
      const previousTotalUSD = previousEntry
        ? Decimal(previousEntry.cumulativeTotalUSD)
        : Decimal(0);

      const nextEntry: PoRepDealsPaymentsHistoryEntry = {
        date: entryISODate,
        volumeUSD: windowVolumeUSD.toDecimalPlaces(2).toNumber(),
        cumulativeTotalUSD: previousTotalUSD
          .add(windowVolumeUSD)
          .toDecimalPlaces(2)
          .toNumber(),
      };

      return [...result, nextEntry];
    }, []);
  }

  public async getDealsDoneCountUpToDate(upToDate?: Date): Promise<number> {
    const cutoffBlock = dateToFilecoinBlockHeight(
      upToDate ?? DateTime.utc().toJSDate(),
      { testnet: this.isTestnet() },
    );

    const count = await this.prismaService.po_rep_deal.count({
      where: {
        proposedAtBlock: {
          lt: cutoffBlock,
        },
      },
    });

    return count;
  }

  public async getOnboardedDataHistory({
    windowSize = 'day',
  }: PoRepHistoryParameters): Promise<PoRepOnboardedDataHistoryEntry[]> {
    const results = await this.prismaService.$queryRawTyped(
      getPoRepOnboardedDataHistory(windowSize, this.isTestnet()),
    );

    return results.map((result) => {
      return {
        date: DateTime.fromJSDate(result.window_start, {
          zone: 'UTC',
        }).toISODate(),
        volume: result.window_total.toString(),
        cumulativeTotal: result.cumulative_total.toString(),
      };
    });
  }

  public async getDealsValueHistory({
    windowSize = 'day',
  }: PoRepHistoryParameters): Promise<PoRepDealsValueHistoryEntry[]> {
    const data = await this.prismaService.$queryRawTyped(
      getPoRepDealsValueHistory(windowSize, this.isTestnet()),
    );
    const firstWindow = data.at(0);

    if (!firstWindow) {
      return [];
    }

    const startDate = DateTime.fromJSDate(firstWindow.window_start, {
      zone: 'UTC',
    });
    const endDate = DateTime.utc().startOf(windowSize);
    const entriesCount =
      endDate.diff(startDate, windowSize)[`${windowSize}s`] + 1;
    const uniqueTokens = uniq(data.map((item) => item.token_address));

    interface Token {
      address: string;
      symbol: string;
      decimals: number;
    }

    const tokenInfoRequests = uniqueTokens.map((tokenAddress) => {
      return Promise.all([
        tokenAddress,
        this.tokenInfoService.getTokenSymbol(tokenAddress),
        this.tokenInfoService.getTokenDecimals(tokenAddress),
      ]);
    });
    const tokenExchangeRateRequests = uniqueTokens.map((tokenAddress) => {
      return Promise.all([
        tokenAddress,
        this.priceOracle.getTokenExchangeRateUSD(tokenAddress),
      ]);
    });
    const [tokenInfoResponses, tokenExchangeRateResponses] = await Promise.all([
      Promise.all(tokenInfoRequests),
      Promise.all(tokenExchangeRateRequests),
    ]);

    const tokensInfo = tokenInfoResponses.reduce((result, tokenInfo) => {
      const [address, symbol, decimals] = tokenInfo;
      return result.set(address, {
        address: address,
        symbol: symbol,
        decimals: decimals,
      });
    }, new Map<string, Token>());
    const tokensUSDExchangeRates = new Map(tokenExchangeRateResponses);

    const dataByWindow = groupBy(
      data.filter((item) => item.window_start !== null),
      (item) =>
        DateTime.fromJSDate(item.window_start, { zone: 'UTC' }).toISODate(),
    );

    return [...new Array(entriesCount)].reduce<PoRepDealsValueHistoryEntry[]>(
      (result, _, index) => {
        const entryDate = startDate.plus({ [windowSize]: index });
        const entryISODate = entryDate.toISODate();
        const dataForWindow = dataByWindow[entryISODate] ?? [];

        const windowVolumeUSD = dataForWindow.reduce(
          (currentWindowVolumeUSD, result) => {
            const tokenUSDExchangeRate = tokensUSDExchangeRates.get(
              result.token_address,
            );
            const tokenInfo = tokensInfo.get(result.token_address);

            // Should not happen but type safety
            if (!tokenUSDExchangeRate || !tokenInfo) {
              throw new Error(
                `Exchange rate or info not found for token "${result.token_address}"`,
              );
            }

            const tokenExponent = Math.pow(10, tokenInfo.decimals);
            const tokenWindowTotalUSD = result.window_total
              .div(tokenExponent)
              .mul(tokenUSDExchangeRate);

            return currentWindowVolumeUSD.add(tokenWindowTotalUSD);
          },
          Decimal(0),
        );

        const previousEntry = index === 0 ? undefined : result.at(index - 1);
        const previousTotalUSD = previousEntry
          ? Decimal(previousEntry.cumulativeTotalUSD)
          : Decimal(0);

        const nextEntry: PoRepDealsValueHistoryEntry = {
          date: entryISODate,
          volumeUSD: windowVolumeUSD.toDecimalPlaces(2).toNumber(),
          cumulativeTotalUSD: previousTotalUSD
            .add(windowVolumeUSD)
            .toDecimalPlaces(2)
            .toNumber(),
        };

        return [...result, nextEntry];
      },
      [],
    );
  }

  public async getSLIComplianceHistory({
    windowSize = 'day',
    sliType,
    providerId: providerIdFilter,
    dealId,
  }: PoRepSLIComplianceHistoryParameters): Promise<
    PoRepSLIComplianceHistoryEntry[]
  > {
    const providerId =
      providerIdFilter !== undefined ? F0Id.from(providerIdFilter) : null;

    const results = await this.prismaService.$queryRawTyped(
      getPoRepSLIComplianceHistory(
        windowSize,
        this.isTestnet(),
        this.mapSLIType(sliType),
        providerId ? providerId.toBigInt() : null,
        dealId ? BigInt(dealId) : null,
      ),
    );

    const grouped = groupBy(results, (result) =>
      DateTime.fromJSDate(result.window_start, { zone: 'UTC' }).toISODate(),
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
          date: dateISOString,
          ...(Object.fromEntries(stateEntries) as Omit<
            PoRepSLIComplianceHistoryEntry,
            'date'
          >),
        };
      });
  }

  public async getActiveClientsHistory({
    windowSize = 'day',
    providerId,
  }: PoRepActiveClientsHistoryParameters): Promise<
    PoRepActiveClientsHistoryEntry[]
  > {
    const providerIdBigInt =
      providerId !== null && providerId !== undefined
        ? F0Id.from(providerId).toBigInt()
        : null;

    const results = await this.prismaService.$queryRawTyped(
      getPoRepActiveClientsHistory(
        windowSize,
        this.isTestnet(),
        providerIdBigInt,
      ),
    );

    return results.map((result) => ({
      date: DateTime.fromJSDate(result.window_start, {
        zone: 'UTC',
      }).toISODate(),
      activeClientsCount: result.active_clients_count,
    }));
  }

  private isTestnet(): boolean {
    return this.recentNodeClient.chain.id === filecoinCalibration.id;
  }

  private mapSLIType(
    poRepSLIType: PoRepSLIType | undefined,
  ): StorageProviderUrlFinderMetricType | null {
    switch (poRepSLIType) {
      case 'bandwidthMbps':
        return StorageProviderUrlFinderMetricType.BANDWIDTH;
      case 'latencyMs':
        return StorageProviderUrlFinderMetricType.TTFB;
      case 'retrievabilityBps':
        return StorageProviderUrlFinderMetricType.RPA_RETRIEVABILITY;
      case 'indexingPct':
      default:
        return null;
    }
  }

  private epochToDate(epoch: bigint | number): Date {
    const genesisTimestamp = this.isTestnet() ? 1667326380n : 1598306400n;
    const epochTimestamp = BigInt(epoch) * 30n + genesisTimestamp;

    // eslint-disable-next-line no-restricted-syntax
    return DateTime.fromSeconds(Number(epochTimestamp), {
      zone: 'UTC',
    }).toJSDate();
  }

  private safeNumericToNumber(input: null): null;
  private safeNumericToNumber(input: string | number | bigint): number;
  private safeNumericToNumber(
    input: string | number | bigint | null,
  ): number | null {
    if (input === null) {
      return null;
    }

    return stringToNumber(input.toString());
  }
}
