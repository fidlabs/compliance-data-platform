import { Inject, Injectable } from '@nestjs/common';
import { groupBy, uniq } from 'lodash';
import { DateTime } from 'luxon';
import { StorageProviderUrlFinderMetricType } from 'prisma/generated/client';
import { Decimal } from 'prisma/generated/client/runtime/library';
import {
  getFilecoinPaymentsForDealsHistory,
  getPoRepActiveClientsHistory,
  getPoRepDealsValueHistory,
  getPoRepOnboardedDataHistory,
  getPoRepSLIComplianceHistory,
} from 'prisma/generated/client/sql';
import { PrismaService } from 'src/db/prisma.service';
import { PoRepPublicClient, RECENT_NODE_CLIENT } from 'src/po-rep-indexer';
import {
  dateToFilecoinBlockHeight,
  F0Id,
  filecoinBlockHeightToDate,
  safeDiv,
} from 'src/utils/utils';
import { filecoinCalibration } from 'viem/chains';
import { ERC20TokenInfoService } from '../erc20-token-info/erc20-token-info.service';
import { PoRepPriceOracleService } from '../po-rep-price-oracle/po-rep-price-oracle.service';
import {
  PoRepActiveClientsHistoryEntry,
  PoRepActiveClientsHistoryParameters,
  PoRepDealsPaymentsHistoryEntry,
  PoRepDealsValueHistoryEntry,
  PoRepHistoryParameters,
  PoRepOnboardedDataHistoryEntry,
  PoRepSLIComplianceHistoryEntry,
  PoRepSLIComplianceHistoryParameters,
  PoRepSLIType,
} from './types.po-rep';

@Injectable()
export class PoRepService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly tokenInfoService: ERC20TokenInfoService,
    private readonly priceOracle: PoRepPriceOracleService,
    @Inject(RECENT_NODE_CLIENT)
    private readonly recentNodeClient: PoRepPublicClient,
  ) {}

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
      (item) => DateTime.fromJSDate(item.window_start).toISODate(),
    );

    return [...new Array(entriesCount)].reduce<
      PoRepDealsPaymentsHistoryEntry[]
    >((result, _, index) => {
      const entryDate = startDate.plus({ [windowSize]: index });
      const entryISODate = entryDate.toISODate();
      const dataForWindow = dataByWindow[entryISODate] ?? [];

      const windowVolumeUSD = dataForWindow
        .reduce((currentWindowVolumeUSD, result) => {
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
        }, new Decimal(0))
        .toDecimalPlaces(2)
        .toNumber();

      const previousEntry = index === 0 ? undefined : result.at(index - 1);
      const previousTotalUSD = previousEntry?.cumulativeTotalUSD ?? 0;

      const nextEntry: PoRepDealsPaymentsHistoryEntry = {
        date: entryISODate,
        volumeUSD: windowVolumeUSD,
        cumulativeTotalUSD: previousTotalUSD + windowVolumeUSD,
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
      (item) => DateTime.fromJSDate(item.window_start).toISODate(),
    );

    return [...new Array(entriesCount)].reduce<PoRepDealsValueHistoryEntry[]>(
      (result, _, index) => {
        const entryDate = startDate.plus({ [windowSize]: index });
        const entryISODate = entryDate.toISODate();
        const dataForWindow = dataByWindow[entryISODate] ?? [];

        const windowVolumeUSD = dataForWindow
          .reduce((currentWindowVolumeUSD, result) => {
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
          }, new Decimal(0))
          .toDecimalPlaces(2)
          .toNumber();

        const previousEntry = index === 0 ? undefined : result.at(index - 1);
        const previousTotalUSD = previousEntry?.cumulativeTotalUSD ?? 0;

        const nextEntry: PoRepDealsValueHistoryEntry = {
          date: entryISODate,
          volumeUSD: windowVolumeUSD,
          cumulativeTotalUSD: previousTotalUSD + windowVolumeUSD,
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
      DateTime.fromJSDate(result.window_start).toISODate(),
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
      date: DateTime.fromJSDate(result.window_start).toISODate(),
      activeClientsCount: result.active_clients_count,
    }));
  }

  private isTestnet(): boolean {
    return this.recentNodeClient.chain.id === filecoinCalibration.id;
  }

  private mapSLIType(
    poRepSLIType: PoRepSLIType | undefined,
  ): StorageProviderUrlFinderMetricType {
    switch (poRepSLIType) {
      case 'bandwidthMbps':
        return StorageProviderUrlFinderMetricType.BANDWIDTH;
      case 'indexingPct':
        return null; // Not measured
      case 'latencyMs':
        return StorageProviderUrlFinderMetricType.TTFB;
      case 'retrievabilityBps':
        return StorageProviderUrlFinderMetricType.RPA_RETRIEVABILITY;
    }
  }
}
