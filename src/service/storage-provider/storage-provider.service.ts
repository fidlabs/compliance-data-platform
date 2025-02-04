import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import {
  getProviderBiggestClientDistribution,
  getProviderBiggestClientDistributionAcc,
  getProviderClientsWeekly,
  getProviderClientsWeeklyAcc,
  getProviderRetrievability,
  getProviderRetrievabilityAcc,
} from '../../../prisma/generated/client/sql';
import { RetrievabilityWeekResponseDto } from '../../types/retrievabilityWeekResponse.dto';
import { HistogramHelper } from '../../utils/histogram.helper';
import { DateTime } from 'luxon';
import { Prisma } from 'prisma/generated/client';
import { modelName } from 'src/utils/prisma.helper';
import { HistogramWeekResponseDto } from '../../types/histogramWeek.response.dto';
import { ProviderComplianceScoreRange } from '../../types/providerComplianceScoreRange';
import { SpsComplianceWeekDto } from '../../types/spsComplianceWeek.dto';

@Injectable()
export class StorageProviderService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly histogramHelper: HistogramHelper,
  ) {}

  public async getProviderClients(
    isAccumulative: boolean,
  ): Promise<HistogramWeekResponseDto> {
    const clientProviderDistributionWeeklyTable = isAccumulative
      ? Prisma.ModelName.client_provider_distribution_weekly_acc
      : Prisma.ModelName.client_provider_distribution_weekly;

    const providerCountResult = await this.prismaService.$queryRaw<
      [
        {
          count: number;
        },
      ]
    >`select count(distinct provider)::int
      from ${modelName(clientProviderDistributionWeeklyTable)}`;

    const query = isAccumulative
      ? getProviderClientsWeeklyAcc
      : getProviderClientsWeekly;

    return await this.histogramHelper.getWeeklyHistogramResult(
      await this.prismaService.$queryRawTyped(query()),
      providerCountResult[0].count,
    );
  }

  public async getProviderBiggestClientDistribution(
    isAccumulative: boolean,
  ): Promise<HistogramWeekResponseDto> {
    const clientProviderDistributionWeeklyTable = isAccumulative
      ? Prisma.ModelName.client_provider_distribution_weekly_acc
      : Prisma.ModelName.client_provider_distribution_weekly;

    const providerCountResult = await this.prismaService.$queryRaw<
      [
        {
          count: number;
        },
      ]
    >`select count(distinct provider)::int
      from ${modelName(clientProviderDistributionWeeklyTable)}`;

    const query = isAccumulative
      ? getProviderBiggestClientDistributionAcc
      : getProviderBiggestClientDistribution;

    return await this.histogramHelper.getWeeklyHistogramResult(
      await this.prismaService.$queryRawTyped(query()),
      providerCountResult[0].count,
    );
  }

  public async getProviderRetrievability(
    isAccumulative: boolean,
  ): Promise<RetrievabilityWeekResponseDto> {
    const providersWeeklyTable = isAccumulative
      ? Prisma.ModelName.providers_weekly_acc
      : Prisma.ModelName.providers_weekly;

    const providerCountAndAverageSuccessRate = await this.prismaService
      .$queryRaw<
      [
        {
          count: number;
          averageSuccessRate: number;
        },
      ]
    >`select count(distinct provider)::int,
             100 * avg(avg_retrievability_success_rate) as "averageSuccessRate"
      from ${modelName(providersWeeklyTable)} where week = ${DateTime.now().toUTC().minus({ week: 1 }).startOf('week').toJSDate()};`;

    const query = isAccumulative
      ? getProviderRetrievabilityAcc
      : getProviderRetrievability;

    const weeklyHistogramResult =
      await this.histogramHelper.getWeeklyHistogramResult(
        await this.prismaService.$queryRawTyped(query()),
        providerCountAndAverageSuccessRate[0].count,
      );

    return RetrievabilityWeekResponseDto.of(
      providerCountAndAverageSuccessRate[0].averageSuccessRate,
      weeklyHistogramResult,
    );
  }

  public async getWeekProvidersForClients(
    week: Date,
    isAccumulative: boolean,
    clients: string[],
  ): Promise<string[]> {
    return (
      await (
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
      })
    ).map((p) => p.provider);
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

  public getCompliantProvidersPercentage(
    weekProvidersCompliance: {
      complianceScore: number;
      provider: string;
    }[],
    providers: string[],
  ): {
    compliantSpsPercentage: number;
    partiallyCompliantSpsPercentage: number;
    nonCompliantSpsPercentage: number;
  } {
    return {
      compliantSpsPercentage: this._getCompliantProvidersPercentage(
        weekProvidersCompliance,
        providers,
        ProviderComplianceScoreRange.Compliant,
      ),
      partiallyCompliantSpsPercentage: this._getCompliantProvidersPercentage(
        weekProvidersCompliance,
        providers,
        ProviderComplianceScoreRange.PartiallyCompliant,
      ),
      nonCompliantSpsPercentage: this._getCompliantProvidersPercentage(
        weekProvidersCompliance,
        providers,
        ProviderComplianceScoreRange.NonCompliant,
      ),
    };
  }

  private _getCompliantProvidersPercentage(
    weekProvidersCompliance: {
      complianceScore: number;
      provider: string;
    }[],
    providers: string[],
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

    return (
      (100 *
        weekProvidersCompliance.filter(
          (p) =>
            providers.includes(p.provider) &&
            validComplianceScores.includes(p.complianceScore),
        ).length) /
      providers.length
    );
  }
}
