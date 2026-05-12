import { Inject, Injectable } from '@nestjs/common';
import { groupBy, uniq } from 'lodash';
import { DateTime } from 'luxon';
import { Decimal } from 'prisma/generated/client/runtime/library';
import { getFilecoinPaymentsForDealsHistory } from 'prisma/generated/client/sql';
import { PrismaService } from 'src/db/prisma.service';
import { PoRepPublicClient, RECENT_NODE_CLIENT } from 'src/po-rep-indexer';
import {
  dateToFilecoinBlockHeight,
  filecoinBlockHeightToDate,
} from 'src/utils/utils';
import { filecoinCalibration } from 'viem/chains';
import { ERC20TokenInfoService } from '../erc20-token-info/erc20-token-info.service';
import { PoRepPriceOracleService } from '../po-rep-price-oracle/po-rep-price-oracle.service';

export interface PoRepDealsPaymentsSummaryHistoryEntry {
  day: DateTime;
  dailyAmountUSD: number;
  cumulativeAmountUSD: number;
}

export type PoRepDealsPaymentsSummaryHistory =
  PoRepDealsPaymentsSummaryHistoryEntry[];

@Injectable()
export class PoRepService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly tokenInfoService: ERC20TokenInfoService,
    private readonly priceOracle: PoRepPriceOracleService,
    @Inject(RECENT_NODE_CLIENT)
    private readonly recentNodeClient: PoRepPublicClient,
  ) {}

  public async getDealsPaymentsSummaryHistory(): Promise<PoRepDealsPaymentsSummaryHistory> {
    const earliestDeal = await this.prismaService.po_rep_deal.findFirst({
      orderBy: {
        proposedAtBlock: 'asc',
      },
    });

    if (!earliestDeal) {
      return [];
    }

    const startDay = DateTime.fromJSDate(
      // eslint-disable-next-line no-restricted-syntax
      filecoinBlockHeightToDate(Number(earliestDeal.proposedAtBlock), {
        testnet: this.isTestnet(),
      }),
    )
      .toUTC()
      .startOf('day');
    const endDay = DateTime.utc().startOf('day');
    const entriesCount = endDay.diff(startDay, 'day').days + 1;
    const data = await this.prismaService.$queryRawTyped(
      getFilecoinPaymentsForDealsHistory(this.isTestnet()),
    );

    interface Token {
      address: string;
      symbol: string;
      decimals: number;
    }

    const uniqueTokens = uniq(data.map((item) => item.token));

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

    const dataByDay = groupBy(
      data.filter((item) => item.day !== null),
      (item) => item.day.toISOString(),
    );

    // DB query returns daily data per token so we need to convert values in
    // token units to USD and sum them for each day
    const combinedDayData = Object.entries(
      dataByDay,
    ).map<PoRepDealsPaymentsSummaryHistoryEntry>(
      ([dateISOString, perDateResults]) => {
        const [dailyAmountUSD, cumulativeAmountUSD] = perDateResults.reduce(
          ([currentDailyAmountUSD, currentCumulativeAmountUSD], result) => {
            const tokenUSDExchangeRate = tokensUSDExchangeRates.get(
              result.token,
            );
            const tokenInfo = tokensInfo.get(result.token);

            // Should not happen but type safety
            if (!tokenUSDExchangeRate || !tokenInfo) {
              throw new Error(
                `Exchange rate or info not found for token "${result.token}"`,
              );
            }

            const tokenExponent = Math.pow(10, tokenInfo.decimals);
            const tokenDailyAmountUSD = result.daily_amount
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
          day: DateTime.fromISO(dateISOString, { zone: 'utc' }),
          dailyAmountUSD: dailyAmountUSD.toDecimalPlaces(2).toNumber(),
          cumulativeAmountUSD: cumulativeAmountUSD
            .toDecimalPlaces(2)
            .toNumber(),
        };
      },
    );

    const combinedDayDataByISODate = new Map(
      combinedDayData.map((item) => [item.day.toISODate(), item]),
    );

    return [
      ...new Array(entriesCount),
    ].reduce<PoRepDealsPaymentsSummaryHistory>((result, _, index) => {
      const entryDay = startDay.plus({ day: index });
      const entryISODate = entryDay.toISODate();
      const matchingData = combinedDayDataByISODate.get(entryISODate);

      if (matchingData) {
        return [...result, matchingData];
      }

      const previousEntry = index === 0 ? undefined : result.at(index - 1);
      const nextEntry: PoRepDealsPaymentsSummaryHistoryEntry = {
        day: entryDay,
        dailyAmountUSD: 0,
        cumulativeAmountUSD: previousEntry?.cumulativeAmountUSD ?? 0,
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

  private isTestnet(): boolean {
    return this.recentNodeClient.chain.id === filecoinCalibration.id;
  }
}
