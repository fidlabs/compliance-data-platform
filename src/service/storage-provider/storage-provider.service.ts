import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import {
  getProviderBiggestClientDistribution,
  getProviderBiggestClientDistributionAcc,
  getProviderClientsWeekly,
  getProviderClientsWeeklyAcc,
  getProviderRetrievability,
  getProviderRetrievabilityAcc,
} from 'prisma/generated/client/sql';
import { DateTime } from 'luxon';
import { Prisma } from 'prisma/generated/client';
import { modelName } from 'src/utils/prisma';
import {
  StorageProviderComplianceMetrics,
  StorageProviderComplianceScoreRange,
  StorageProviderComplianceWeek,
  StorageProviderComplianceWeekCount,
  StorageProviderComplianceWeekPercentage,
  StorageProviderComplianceWeekResponse,
  StorageProviderComplianceWeekTotalDatacap,
} from './types.storage-provider';
import { HistogramHelperService } from '../histogram-helper/histogram-helper.service';
import {
  HistogramWeekFlat,
  HistogramWeekResponse,
  RetrievabilityHistogramWeek,
  RetrievabilityHistogramWeekResponse,
  RetrievabilityWeekResponse,
} from '../histogram-helper/types.histogram-helper';
import { Cacheable } from '../../utils/cacheable';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class StorageProviderService {
  private readonly logger = new Logger(StorageProviderService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly histogramHelper: HistogramHelperService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  public async getProviderClientsWeekly(
    isAccumulative: boolean,
  ): Promise<HistogramWeekResponse> {
    const query = isAccumulative
      ? getProviderClientsWeeklyAcc
      : getProviderClientsWeekly;

    return new HistogramWeekResponse(
      await this.getProviderCount(),
      await this.histogramHelper.getWeeklyHistogramResult(
        await this.prismaService.$queryRawTyped(query()),
      ),
    );
  }

  public async getProviderBiggestClientDistributionWeekly(
    isAccumulative: boolean,
  ): Promise<HistogramWeekResponse> {
    const query = isAccumulative
      ? getProviderBiggestClientDistributionAcc
      : getProviderBiggestClientDistribution;

    return new HistogramWeekResponse(
      await this.getProviderCount(),
      await this.histogramHelper.getWeeklyHistogramResult(
        await this.prismaService.$queryRawTyped(query()),
        100,
      ),
    );
  }

  public async getProviderCount(): Promise<number> {
    return (
      await this.prismaService.$queryRaw<
        [{ count: number }]
      >`select count(distinct provider)::int
        from ${modelName(Prisma.ModelName.providers_weekly_acc)}`
    )[0].count;
  }

  public async getProviderRetrievabilityWeekly(
    isAccumulative: boolean,
  ): Promise<RetrievabilityWeekResponse> {
    const lastWeekAverageRetrievability =
      await this.getLastWeekAverageProviderRetrievability(isAccumulative);

    const query = isAccumulative
      ? getProviderRetrievabilityAcc
      : getProviderRetrievability;

    const queryResult: HistogramWeekFlat[] =
      await this.prismaService.$queryRawTyped(query());

    if (!queryResult || queryResult.length === 0 || !queryResult[0]) {
      this.logger.error(
        `Database getProviderRetrievability${isAccumulative ? 'Acc' : ''} query returned no results, this should not happen: ${queryResult}`,
      );
    }

    const weeklyHistogramResult =
      await this.histogramHelper.getWeeklyHistogramResult(queryResult, 100);

    return new RetrievabilityWeekResponse(
      lastWeekAverageRetrievability * 100,
      new RetrievabilityHistogramWeekResponse(
        await this.getProviderCount(),
        await Promise.all(
          weeklyHistogramResult.map(async (histogramWeek) =>
            RetrievabilityHistogramWeek.of(
              histogramWeek,
              (await this.getWeekAverageProviderRetrievability(
                histogramWeek.week,
                isAccumulative,
              )) * 100,
            ),
          ),
        ),
      ),
    );
  }

  public getLastWeekAverageProviderRetrievability(
    isAccumulative: boolean,
  ): Promise<number> {
    const lastWeek = DateTime.now()
      .toUTC()
      .minus({ week: 1 })
      .startOf('week')
      .toJSDate();

    return this.getWeekAverageProviderRetrievability(lastWeek, isAccumulative);
  }

  public async getProviderComplianceWeekly(
    isAccumulative: boolean,
    metricsToCheck?: StorageProviderComplianceMetrics,
  ): Promise<StorageProviderComplianceWeekResponse> {
    const weeks = await this.getWeeksTracked();

    const lastWeekAverageRetrievability =
      await this.getLastWeekAverageProviderRetrievability(isAccumulative);

    const result: StorageProviderComplianceWeek[] = await Promise.all(
      weeks.map(async (week) => {
        const weekAverageRetrievability =
          await this.getWeekAverageProviderRetrievability(week, isAccumulative);

        const weekProviders = await this.getWeekProviders(week, isAccumulative);

        const weekProvidersCompliance = weekProviders.map((provider) =>
          this.getWeekProviderComplianceScore(
            provider,
            weekAverageRetrievability,
            metricsToCheck,
          ),
        );

        const weekProvidersIds = weekProviders.map(
          (provider) => provider.provider,
        );

        return {
          week: week,
          averageSuccessRate: weekAverageRetrievability * 100,
          totalSps: weekProviders.length,
          ...this.getProviderComplianceWeekCount(
            weekProvidersCompliance,
            weekProvidersIds,
          ),
          ...this.getProviderComplianceWeekTotalDatacap(
            weekProvidersCompliance,
            weekProvidersIds,
            await this.getWeekProvidersTotalDatacap(week, isAccumulative),
          ),
        };
      }),
    );

    return new StorageProviderComplianceWeekResponse(
      lastWeekAverageRetrievability * 100,
      this.histogramHelper.withoutCurrentWeek(
        this.histogramHelper.sorted(result),
      ),
    );
  }

  public async getWeekProvidersTotalDatacap(
    week: Date,
    isAccumulative: boolean,
  ): Promise<{ total_deal_size: bigint; provider: string }[]> {
    return (
      (isAccumulative
        ? this.prismaService.providers_weekly_acc
        : this.prismaService.providers_weekly) as any
    ).findMany({
      where: {
        week: week,
      },
      select: {
        provider: true,
        total_deal_size: true,
      },
    });
  }

  @Cacheable({ ttl: 1000 * 60 * 30 }) // 30 minutes
  private async _getWeekProvidersForClients(
    week: Date,
    isAccumulative: boolean,
  ): Promise<{ provider: string; client: string }[]> {
    return await (
      (isAccumulative
        ? this.prismaService.client_provider_distribution_weekly_acc
        : this.prismaService.client_provider_distribution_weekly) as any
    ).findMany({
      where: {
        week: week,
      },
      select: {
        provider: true,
        client: true,
      },
      distinct: ['provider', 'client'],
    });
  }

  public async getWeekProvidersForClients(
    week: Date,
    isAccumulative: boolean,
    clients: string[],
  ): Promise<string[]> {
    const providers = await this._getWeekProvidersForClients(
      week,
      isAccumulative,
    );

    const result = providers
      .filter((p) => clients.includes(p.client))
      .map((p) => p.provider);

    return [...new Set(result)];
  }

  @Cacheable({ ttl: 1000 * 60 * 30 }) // 30 minutes
  public async getWeekProviders(week: Date, isAccumulative: boolean) {
    return (
      (isAccumulative
        ? this.prismaService.providers_weekly_acc
        : this.prismaService.providers_weekly) as any
    ).findMany({
      where: {
        week: week,
      },
    });
  }

  public async getWeeksTracked(): Promise<Date[]> {
    return (
      await this.prismaService.providers_weekly_acc.findMany({
        distinct: ['week'],
        select: {
          week: true,
        },
        orderBy: {
          week: 'asc',
        },
      })
    ).map((p) => p.week);
  }

  // returns 0 - 1
  public async getWeekAverageProviderRetrievability(
    week: Date,
    isAccumulative: boolean,
  ): Promise<number> {
    return (
      await (
        (isAccumulative
          ? this.prismaService.providers_weekly_acc
          : this.prismaService.providers_weekly) as any
      ).aggregate({
        _avg: {
          avg_retrievability_success_rate: true,
        },
        where: {
          week: week,
        },
      })
    )._avg.avg_retrievability_success_rate;
  }

  // returns compliance score 0 - 3 per provider
  public getWeekProviderComplianceScore(
    providerWeekly: {
      avg_retrievability_success_rate: number;
      num_of_clients: number;
      biggest_client_total_deal_size: bigint | null;
      total_deal_size: bigint | null;
      provider: string;
    },
    weekAverageRetrievability: number,
    metricsToCheck?: StorageProviderComplianceMetrics,
  ): {
    complianceScore: number;
    provider: string;
  } {
    let complianceScore = 0;

    // TODO when business is ready let's switch to using http success rate.
    // Question - do we make a cutoff date for this? (like use normal rate
    // till 25w4 and http rate after that)?
    if (
      metricsToCheck?.retrievability === 'false' ||
      providerWeekly.avg_retrievability_success_rate > weekAverageRetrievability
    )
      complianceScore++;

    if (
      metricsToCheck?.numberOfClients === 'false' ||
      providerWeekly.num_of_clients > 3
    )
      complianceScore++;

    if (
      metricsToCheck?.totalDealSize === 'false' ||
      providerWeekly.biggest_client_total_deal_size * 100n <=
        30n * providerWeekly.total_deal_size
    )
      complianceScore++;

    return {
      provider: providerWeekly.provider,
      complianceScore: complianceScore,
    };
  }

  public getProviderComplianceWeekCount(
    weekProvidersCompliance: {
      complianceScore: number;
      provider: string;
    }[],
    validProviders: string[],
  ): StorageProviderComplianceWeekCount {
    return {
      compliantSps: this._getProviderComplianceWeekCount(
        weekProvidersCompliance,
        validProviders,
        StorageProviderComplianceScoreRange.Compliant,
      ),
      partiallyCompliantSps: this._getProviderComplianceWeekCount(
        weekProvidersCompliance,
        validProviders,
        StorageProviderComplianceScoreRange.PartiallyCompliant,
      ),
      nonCompliantSps: this._getProviderComplianceWeekCount(
        weekProvidersCompliance,
        validProviders,
        StorageProviderComplianceScoreRange.NonCompliant,
      ),
    };
  }

  public getProviderComplianceWeekTotalDatacap(
    weekProvidersCompliance: {
      complianceScore: number;
      provider: string;
    }[],
    validProviders: string[],
    weekProvidersTotalDatacap: {
      total_deal_size: bigint | null;
      provider: string;
    }[],
  ): StorageProviderComplianceWeekTotalDatacap {
    return {
      compliantSpsTotalDatacap: this._getProviderComplianceWeekTotalDatacap(
        weekProvidersCompliance,
        validProviders,
        StorageProviderComplianceScoreRange.Compliant,
        weekProvidersTotalDatacap,
      ),
      partiallyCompliantSpsTotalDatacap:
        this._getProviderComplianceWeekTotalDatacap(
          weekProvidersCompliance,
          validProviders,
          StorageProviderComplianceScoreRange.PartiallyCompliant,
          weekProvidersTotalDatacap,
        ),
      nonCompliantSpsTotalDatacap: this._getProviderComplianceWeekTotalDatacap(
        weekProvidersCompliance,
        validProviders,
        StorageProviderComplianceScoreRange.NonCompliant,
        weekProvidersTotalDatacap,
      ),
    };
  }

  public getProviderComplianceWeekPercentage(
    weekProvidersCompliance: {
      complianceScore: number;
      provider: string;
    }[],
    validProviders: string[],
  ): StorageProviderComplianceWeekPercentage {
    return {
      compliantSpsPercentage: this._getProviderComplianceWeekPercentage(
        weekProvidersCompliance,
        validProviders,
        StorageProviderComplianceScoreRange.Compliant,
      ),
      partiallyCompliantSpsPercentage:
        this._getProviderComplianceWeekPercentage(
          weekProvidersCompliance,
          validProviders,
          StorageProviderComplianceScoreRange.PartiallyCompliant,
        ),
      nonCompliantSpsPercentage: this._getProviderComplianceWeekPercentage(
        weekProvidersCompliance,
        validProviders,
        StorageProviderComplianceScoreRange.NonCompliant,
      ),
    };
  }

  // returns list of storage providers in validProviders with validComplianceScore compliance score
  private getProviderComplianceWeekProviders(
    weekProvidersCompliance: {
      complianceScore: number;
      provider: string;
    }[],
    validProviders: string[],
    validComplianceScore: StorageProviderComplianceScoreRange,
  ): string[] {
    const validComplianceScores: number[] = [];

    switch (validComplianceScore) {
      case StorageProviderComplianceScoreRange.NonCompliant:
        validComplianceScores.push(0);
        break;
      case StorageProviderComplianceScoreRange.PartiallyCompliant:
        validComplianceScores.push(1, 2);
        break;
      case StorageProviderComplianceScoreRange.Compliant:
        validComplianceScores.push(3);
        break;
    }

    return (
      weekProvidersCompliance
        .filter(
          (p) =>
            validProviders.includes(p.provider) &&
            validComplianceScores.includes(p.complianceScore),
        )
        .map((p) => p.provider) ?? []
    );
  }

  private _getProviderComplianceWeekCount(
    weekProvidersCompliance: {
      complianceScore: number;
      provider: string;
    }[],
    validProviders: string[],
    validComplianceScore: StorageProviderComplianceScoreRange,
  ): number {
    return this.getProviderComplianceWeekProviders(
      weekProvidersCompliance,
      validProviders,
      validComplianceScore,
    ).length;
  }

  private _getProviderComplianceWeekTotalDatacap(
    weekProvidersCompliance: {
      complianceScore: number;
      provider: string;
    }[],
    validProviders: string[],
    validComplianceScore: StorageProviderComplianceScoreRange,
    weekProvidersTotalDatacap: {
      total_deal_size: bigint | null;
      provider: string;
    }[],
  ): number {
    // TODO calling this 2 times
    const validWeekProviders = this.getProviderComplianceWeekProviders(
      weekProvidersCompliance,
      validProviders,
      validComplianceScore,
    );

    return Number(
      weekProvidersTotalDatacap
        .filter((p) => validWeekProviders.includes(p.provider))
        .reduce((acc, p) => acc + p.total_deal_size, 0n) ?? 0,
    );
  }

  private _getProviderComplianceWeekPercentage(
    weekProvidersCompliance: {
      complianceScore: number;
      provider: string;
    }[],
    validProviders: string[],
    validComplianceScore: StorageProviderComplianceScoreRange,
  ): number {
    return validProviders.length
      ? (this._getProviderComplianceWeekCount(
          weekProvidersCompliance,
          validProviders,
          validComplianceScore,
        ) /
          validProviders.length) *
          100
      : 0;
  }
}
