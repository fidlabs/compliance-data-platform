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

@Injectable()
export class ProviderService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly histogramHelper: HistogramHelper,
  ) {}

  async getProviderClients(
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

  async getProviderBiggestClientDistribution(
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

  async getProviderRetrievability(
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
}
