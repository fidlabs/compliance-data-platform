import { Inject, Injectable } from '@nestjs/common';
import { groupBy, uniq } from 'lodash';
import { DateTime } from 'luxon';
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
} from 'src/utils/utils';
import { F0IdInput } from 'src/utils/validators';
import { filecoinCalibration } from 'viem/chains';
import { ERC20TokenInfoService } from '../erc20-token-info/erc20-token-info.service';
import { PoRepPriceOracleService } from '../po-rep-price-oracle/po-rep-price-oracle.service';

type WindowSize = 'day' | 'week' | 'month';

export interface SLIComplianceHistoryParameters {
  windowSize: WindowSize;
  sliType: 'RPA_RETRIEVABILITY' | 'BANDWIDTH' | 'TTFB' | null;
  providerId: bigint | null;
  dealId: bigint | null;
}

export interface ActiveClientsHistoryParameters {
  windowSize: WindowSize;
  providerId?: F0Id | F0IdInput | null;
}

export interface PoRepDealsPaymentsSummaryHistoryEntry {
  date: DateTime;
  volumeUSD: number;
  cumulativeTotalUSD: number;
}

export type PoRepDealsPaymentsSummaryHistory =
  PoRepDealsPaymentsSummaryHistoryEntry[];

export interface PoRepOnboardedDataHistoryEntry {
  date: DateTime;
  volume: bigint;
  cumulativeTotal: bigint;
}

export type PoRepDealsOnboardedDataHistory = PoRepOnboardedDataHistoryEntry[];

export interface PoRepDealsValueHistoryEntry {
  date: DateTime;
  volumeUSD: number;
  cumulativeTotalUSD: number;
}

export type PoRepDealsValueHistory = PoRepDealsValueHistoryEntry[];

@Injectable()
export class PoRepService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly tokenInfoService: ERC20TokenInfoService,
    private readonly priceOracle: PoRepPriceOracleService,
    @Inject(RECENT_NODE_CLIENT)
    private readonly recentNodeClient: PoRepPublicClient,
  ) {}

  public async getDealsPaymentsSummaryHistory(
    windowSize: WindowSize,
  ): Promise<PoRepDealsPaymentsSummaryHistory> {
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

    const dataByDate = groupBy(
      data.filter((item) => item.window_start !== null),
      (item) => item.window_start.toISOString(),
    );

    // DB query returns window data per token so we need to convert values in
    // token units to USD and sum them for each window
    const combinedWindowData = Object.entries(
      dataByDate,
    ).map<PoRepDealsPaymentsSummaryHistoryEntry>(
      ([dateISOString, perDateResults]) => {
        const [windowAmountUSD, cumulativeAmountUSD] = perDateResults.reduce(
          ([currentDailyAmountUSD, currentCumulativeAmountUSD], result) => {
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
            const tokenDailyAmountUSD = result.window_amount
              .div(tokenExponent)
              .mul(tokenUSDExchangeRate);
            const tokenCumulativeAmountUSD = result.cumulative_amount
              .div(tokenExponent)
              .mul(tokenUSDExchangeRate);

            return [
              currentDailyAmountUSD.add(tokenDailyAmountUSD),
              currentCumulativeAmountUSD.add(tokenCumulativeAmountUSD),
            ];
          },
          [new Decimal(0), new Decimal(0)],
        );

        return {
          date: DateTime.fromISO(dateISOString, { zone: 'utc' }),
          volumeUSD: windowAmountUSD.toDecimalPlaces(2).toNumber(),
          cumulativeTotalUSD: cumulativeAmountUSD.toDecimalPlaces(2).toNumber(),
        };
      },
    );

    const combinedWindowDataByISODate = new Map(
      combinedWindowData.map((item) => [item.date.toISODate(), item]),
    );

    return [
      ...new Array(entriesCount),
    ].reduce<PoRepDealsPaymentsSummaryHistory>((result, _, index) => {
      const entryDay = startDate.plus({ [windowSize]: index });
      const entryISODate = entryDay.toISODate();
      const matchingData = combinedWindowDataByISODate.get(entryISODate);

      if (matchingData) {
        return [...result, matchingData];
      }

      const previousEntry = index === 0 ? undefined : result.at(index - 1);
      const nextEntry: PoRepDealsPaymentsSummaryHistoryEntry = {
        date: entryDay,
        volumeUSD: 0,
        cumulativeTotalUSD: previousEntry?.cumulativeTotalUSD ?? 0,
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

  public async getOnboardedDataHistory(
    windowSize: WindowSize,
  ): Promise<PoRepDealsOnboardedDataHistory> {
    const results = await this.prismaService.$queryRawTyped(
      getPoRepOnboardedDataHistory(windowSize, this.isTestnet()),
    );

    return results.map((result) => {
      return {
        date: DateTime.fromJSDate(result.window_start, { zone: 'UTC' }),
        volume: BigInt(result.window_total.toString()),
        cumulativeTotal: BigInt(result.cumulative_total.toString()),
      };
    });
  }

  public async getDealsValueHistory(
    windowSize: WindowSize,
  ): Promise<PoRepDealsValueHistory> {
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
      (item) => item.window_start.toISOString(),
    );

    // DB query returns window data per token so we need to convert values in
    // token units to USD and sum them for each window
    const combinedWindowData = Object.entries(
      dataByWindow,
    ).map<PoRepDealsValueHistoryEntry>(([dateISOString, windowResults]) => {
      const [windowAmountUSD, cumulativeAmountUSD] = windowResults.reduce(
        ([currentWindowAmountUSD, currentCumulativeAmountUSD], result) => {
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
          const tokenDailyAmountUSD = result.window_total
            .div(tokenExponent)
            .mul(tokenUSDExchangeRate);
          const tokenCumulativeAmountUSD = result.cumulative_amount
            .div(tokenExponent)
            .mul(tokenUSDExchangeRate);

          return [
            currentWindowAmountUSD.add(tokenDailyAmountUSD),
            currentCumulativeAmountUSD.add(tokenCumulativeAmountUSD),
          ];
        },
        [new Decimal(0), new Decimal(0)],
      );

      return {
        date: DateTime.fromISO(dateISOString, { zone: 'utc' }),
        volumeUSD: windowAmountUSD.toDecimalPlaces(2).toNumber(),
        cumulativeTotalUSD: cumulativeAmountUSD.toDecimalPlaces(2).toNumber(),
      };
    });

    const combinedWindowDataByISODate = new Map(
      combinedWindowData.map((item) => [item.date.toISODate(), item]),
    );

    return [...new Array(entriesCount)].reduce<PoRepDealsValueHistory>(
      (result, _, index) => {
        const entryDay = startDate.plus({ [windowSize]: index });
        const entryISODate = entryDay.toISODate();
        const matchingData = combinedWindowDataByISODate.get(entryISODate);

        if (matchingData) {
          return [...result, matchingData];
        }

        const previousEntry = index === 0 ? undefined : result.at(index - 1);
        const nextEntry: PoRepDealsValueHistoryEntry = {
          date: entryDay,
          volumeUSD: 0,
          cumulativeTotalUSD: previousEntry?.cumulativeTotalUSD ?? 0,
        };

        return [...result, nextEntry];
      },
      [],
    );
  }

  public async getSLIComplianceHistory({
    windowSize,
    sliType,
    providerId,
    dealId,
  }: SLIComplianceHistoryParameters): Promise<
    getPoRepSLIComplianceHistory.Result[]
  > {
    return this.prismaService.$queryRawTyped(
      getPoRepSLIComplianceHistory(
        windowSize,
        this.isTestnet(),
        sliType,
        providerId,
        dealId,
      ),
    );
  }

  public async getActiveClientsHistory({
    windowSize,
    providerId,
  }: ActiveClientsHistoryParameters): Promise<
    getPoRepActiveClientsHistory.Result[]
  > {
    const providerIdBigInt =
      providerId !== null && providerId !== undefined
        ? F0Id.from(providerId).toBigInt()
        : null;

    return this.prismaService.$queryRawTyped(
      getPoRepActiveClientsHistory(
        windowSize,
        this.isTestnet(),
        providerIdBigInt,
      ),
    );
  }

  private isTestnet(): boolean {
    return this.recentNodeClient.chain.id === filecoinCalibration.id;
  }
}
