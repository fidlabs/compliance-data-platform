import { Injectable } from '@nestjs/common';
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
  HistogramWeekResponse,
  RetrievabilityWeekResponse,
} from '../histogram-helper/types.histogram-helper';

@Injectable()
export class StorageProviderService {
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

    return await this.histogramHelper.getWeeklyHistogramResult(
      await this.prismaService.$queryRawTyped(query()),
      providerCount,
    );
  }

  public async getProviderBiggestClientDistributionWeekly(
    isAccumulative: boolean,
  ): Promise<HistogramWeekResponse> {
    const providerCount = await this.getProviderCount();

    const query = isAccumulative
      ? getProviderBiggestClientDistributionAcc
      : getProviderBiggestClientDistribution;

    return await this.histogramHelper.getWeeklyHistogramResult(
      await this.prismaService.$queryRawTyped(query()),
      providerCount,
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

    const weeklyHistogramResult =
      await this.histogramHelper.getWeeklyHistogramResult(
        await this.prismaService.$queryRawTyped(query()),
        providerCount,
      );

    return RetrievabilityWeekResponse.of(
      lastWeekAverageRetrievability * 100,
      weeklyHistogramResult,
    );
  }

  public async getProviderComplianceWeekly(
    isAccumulative: boolean,
  ): Promise<StorageProviderComplianceWeekResponse> {
    const weeks = await this.getWeeksTracked(isAccumulative);

    const result: StorageProviderComplianceWeek[] = await Promise.all(
      weeks.map(async (week) => {
        const thisWeekAverageRetrievability =
          await this.getWeekAverageProviderRetrievability(week, isAccumulative);

        const weekProviders = await this.getWeekProviders(week, isAccumulative);

        const weekProvidersCompliance = weekProviders.map((wp) =>
          this.getWeekProviderComplianceScore(
            wp,
            thisWeekAverageRetrievability,
          ),
        );

        return {
          week: week,
          ...this.getProviderComplianceWeekCount(
            weekProvidersCompliance,
            weekProviders.map((wp) => wp.provider),
          ),
        };
      }),
    );

    return new StorageProviderComplianceWeekResponse(result);
  }

  public async getWeekProvidersForClients(
    week: Date,
    isAccumulative: boolean,
    clients: string[],
  ) {
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

  public async getWeeksTracked(isAccumulative: boolean): Promise<Date[]> {
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
    thisWeekAverageRetrievability: number,
  ): {
    complianceScore: number;
    provider: string;
  } {
    let complianceScore = 0;

    // TODO when business is ready let's switch to using http success rate.
    // Question - do we make a cutoff date for this? (like use normal rate
    // till 25w4 and http rate after that)?
    if (
      providerWeekly.avg_retrievability_success_rate >
      thisWeekAverageRetrievability
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
