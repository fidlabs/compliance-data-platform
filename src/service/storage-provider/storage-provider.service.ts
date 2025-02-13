import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import {
  getProviderBiggestClientDistribution,
  getProviderBiggestClientDistributionAcc,
  getProviderClientsWeekly,
  getProviderClientsWeeklyAcc,
  getProviderRetrievability,
  getProviderRetrievabilityAcc,
} from '../../../prisma/generated/client/sql';
import { DateTime } from 'luxon';
import { Prisma } from 'prisma/generated/client';
import { modelName } from 'src/utils/prisma';
import {
  ProviderComplianceScoreRange,
  StorageProviderComplianceWeek,
  StorageProviderComplianceWeekCount,
  StorageProviderComplianceWeekPercentage,
  StorageProviderComplianceWeekResponse,
} from './types.storage-provider';
import { HistogramHelperService } from '../histogram-helper/histogram-helper.service';
import {
  HistogramWeekFlat,
  HistogramWeekResponse,
  RetrievabilityHistogramWeek,
  RetrievabilityHistogramWeekResponse,
  RetrievabilityWeekResponse,
} from '../histogram-helper/types.histogram-helper';

@Injectable()
export class StorageProviderService {
  private readonly logger = new Logger(StorageProviderService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly histogramHelper: HistogramHelperService,
  ) {}

  public async getProviderClientsWeekly(
    isAccumulative: boolean,
  ): Promise<HistogramWeekResponse> {
    const providerCount = await this.getProviderCount();

    const query = isAccumulative
      ? getProviderClientsWeeklyAcc
      : getProviderClientsWeekly;

    return new HistogramWeekResponse(
      providerCount,
      await this.histogramHelper.getWeeklyHistogramResult(
        await this.prismaService.$queryRawTyped(query()),
      ),
    );
  }

  public async getProviderBiggestClientDistributionWeekly(
    isAccumulative: boolean,
  ): Promise<HistogramWeekResponse> {
    const providerCount = await this.getProviderCount();

    const query = isAccumulative
      ? getProviderBiggestClientDistributionAcc
      : getProviderBiggestClientDistribution;

    return new HistogramWeekResponse(
      providerCount,
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
    const lastWeek = DateTime.now()
      .toUTC()
      .minus({ week: 1 })
      .startOf('week')
      .toJSDate();

    const lastWeekAverageRetrievability =
      await this.getWeekAverageProviderRetrievability(lastWeek, isAccumulative);

    const providerCount = await this.getProviderCount();

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
        providerCount,
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

  public async getProviderComplianceWeekly(
    isAccumulative: boolean,
  ): Promise<StorageProviderComplianceWeekResponse> {
    const weeks = await this.getProvidersWeeklyWeeksTracked(isAccumulative);

    const result: StorageProviderComplianceWeek[] = await Promise.all(
      weeks.map(async (week) => {
        const weekAverageRetrievability =
          await this.getWeekAverageProviderRetrievability(week, isAccumulative);

        const weekProviders = await this.getWeekProviders(week, isAccumulative);

        const weekProvidersCompliance = weekProviders.map((provider) =>
          this.getWeekProviderComplianceScore(
            provider,
            weekAverageRetrievability,
          ),
        );

        return {
          week: week,
          ...this.getProviderComplianceWeekCount(
            weekProvidersCompliance,
            weekProviders.map((provider) => provider.provider),
          ),
        };
      }),
    );

    return new StorageProviderComplianceWeekResponse(
      this.histogramHelper.withoutCurrentWeek(
        this.histogramHelper.sorted(result),
      ),
    );
  }

  public async getWeekProvidersForClients(
    week: Date,
    isAccumulative: boolean,
    clients: string[],
  ): Promise<{ provider: string }[]> {
    return await (
      (isAccumulative
        ? this.prismaService.client_provider_distribution_weekly_acc
        : this.prismaService.client_provider_distribution_weekly) as any
    ).findMany({
      where: {
        week: week,
        client: {
          in: clients,
        },
      },
      select: {
        provider: true,
      },
      distinct: ['provider'],
    });
  }

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

  public async getProvidersWeeklyWeeksTracked(
    isAccumulative: boolean,
  ): Promise<Date[]> {
    return (
      await (
        (isAccumulative
          ? this.prismaService.providers_weekly_acc
          : this.prismaService.providers_weekly) as any
      ).findMany({
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

  public getWeekProviderComplianceScore(
    providerWeekly: {
      avg_retrievability_success_rate: number;
      num_of_clients: number;
      biggest_client_total_deal_size: bigint;
      total_deal_size: bigint | null;
      provider: string;
    },
    weekAverageRetrievability: number,
  ): {
    complianceScore: number;
    provider: string;
  } {
    let complianceScore = 0;

    // TODO when business is ready let's switch to using http success rate.
    // Question - do we make a cutoff date for this? (like use normal rate
    // till 25w4 and http rate after that)?
    if (
      providerWeekly.avg_retrievability_success_rate > weekAverageRetrievability
    )
      complianceScore++;

    if (providerWeekly.num_of_clients > 3) complianceScore++;

    if (
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
    allProviders: string[],
  ): StorageProviderComplianceWeekCount {
    return {
      compliantSps: this._getProviderComplianceWeekCount(
        weekProvidersCompliance,
        allProviders,
        ProviderComplianceScoreRange.Compliant,
      ),
      partiallyCompliantSps: this._getProviderComplianceWeekCount(
        weekProvidersCompliance,
        allProviders,
        ProviderComplianceScoreRange.PartiallyCompliant,
      ),
      nonCompliantSps: this._getProviderComplianceWeekCount(
        weekProvidersCompliance,
        allProviders,
        ProviderComplianceScoreRange.NonCompliant,
      ),
      totalSps: allProviders.length,
    };
  }

  public getProviderComplianceWeekPercentage(
    weekProvidersCompliance: {
      complianceScore: number;
      provider: string;
    }[],
    allProviders: string[],
  ): StorageProviderComplianceWeekPercentage {
    return {
      compliantSpsPercentage: this._getProviderComplianceWeekPercentage(
        weekProvidersCompliance,
        allProviders,
        ProviderComplianceScoreRange.Compliant,
      ),
      partiallyCompliantSpsPercentage:
        this._getProviderComplianceWeekPercentage(
          weekProvidersCompliance,
          allProviders,
          ProviderComplianceScoreRange.PartiallyCompliant,
        ),
      nonCompliantSpsPercentage: this._getProviderComplianceWeekPercentage(
        weekProvidersCompliance,
        allProviders,
        ProviderComplianceScoreRange.NonCompliant,
      ),
      totalSps: allProviders.length,
    };
  }

  private _getProviderComplianceWeekCount(
    weekProvidersCompliance: {
      complianceScore: number;
      provider: string;
    }[],
    allProviders: string[],
    validComplianceScore: ProviderComplianceScoreRange,
  ): number {
    const validComplianceScores: number[] = [];

    switch (validComplianceScore) {
      case ProviderComplianceScoreRange.NonCompliant:
        validComplianceScores.push(0);
        break;
      case ProviderComplianceScoreRange.PartiallyCompliant:
        validComplianceScores.push(1, 2);
        break;
      case ProviderComplianceScoreRange.Compliant:
        validComplianceScores.push(3);
        break;
    }

    return weekProvidersCompliance.filter(
      (p) =>
        allProviders.includes(p.provider) &&
        validComplianceScores.includes(p.complianceScore),
    ).length;
  }

  private _getProviderComplianceWeekPercentage(
    weekProvidersCompliance: {
      complianceScore: number;
      provider: string;
    }[],
    allProviders: string[],
    validComplianceScore: ProviderComplianceScoreRange,
  ): number {
    return allProviders.length
      ? (this._getProviderComplianceWeekCount(
          weekProvidersCompliance,
          allProviders,
          validComplianceScore,
        ) /
          allProviders.length) *
          100
      : 0;
  }
}
