import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import {
  getAllocatorBiggestClientDistribution,
  getAllocatorRetrievability,
  getAllocatorBiggestClientDistributionAcc,
  getAllocatorRetrievabilityAcc,
} from '../../../prisma/generated/client/sql';
import { HistogramHelper } from '../../utils/histogram.helper';
import { RetrievabilityWeekResponseDto } from '../../types/retrievabilityWeekResponse.dto';
import { groupBy } from 'lodash';
import { ProviderComplianceScoreRange } from '../../types/providerComplianceScoreRange';
import { SpsComplianceWeekResponseDto } from '../../types/spsComplianceWeekResponse.dto';
import { SpsComplianceWeekDto } from '../../types/spsComplianceWeek.dto';
import { DateTime } from 'luxon';
import { Prisma } from 'prisma/generated/client';
import { modelName } from 'src/utils/prisma.helper';
import { HistogramWeekResponseDto } from '../../types/histogramWeek.response.dto';
import { SpsComplianceSingleAllocatorDto } from 'src/types/spsComplianceSingleAllocator.dto';
import { SpsComplianceHistogramWeekDto } from 'src/types/spsComplianceHistogramWeek.dto';
import { SpsComplianceHistogramWeekResponseDto } from 'src/types/spsComplianceHistogramWeekResponse.dto';
import { StorageProviderService } from '../storage-provider/storage-provider.service';

@Injectable()
export class AllocatorService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly histogramHelper: HistogramHelper,
    private readonly storageProviderService: StorageProviderService,
  ) {}

  public async getAllocatorRetrievability(
    isAccumulative: boolean,
  ): Promise<RetrievabilityWeekResponseDto> {
    const lastWeek = DateTime.now()
      .toUTC()
      .minus({ week: 1 })
      .startOf('week')
      .toJSDate();

    const averageSuccessRate = await this.getWeekAverageAllocatorRetrievability(
      lastWeek,
      isAccumulative,
    );

    const clientAllocatorDistributionWeeklyTable = isAccumulative
      ? Prisma.ModelName.client_allocator_distribution_weekly_acc
      : Prisma.ModelName.client_allocator_distribution_weekly;

    const allocatorCountResult = await this.prismaService.$queryRaw<
      [
        {
          count: number;
        },
      ]
    >`select count(distinct allocator)::int
      from ${modelName(clientAllocatorDistributionWeeklyTable)}`;

    const query = isAccumulative
      ? getAllocatorRetrievabilityAcc
      : getAllocatorRetrievability;

    const weeklyHistogramResult =
      await this.histogramHelper.getWeeklyHistogramResult(
        await this.prismaService.$queryRawTyped(query()),
        allocatorCountResult[0].count,
      );

    return RetrievabilityWeekResponseDto.of(
      averageSuccessRate * 100,
      weeklyHistogramResult,
    );
  }

  public async getAllocatorBiggestClientDistribution(
    isAccumulative: boolean,
  ): Promise<HistogramWeekResponseDto> {
    const clientAllocatorDistributionWeeklyTable = isAccumulative
      ? Prisma.ModelName.client_allocator_distribution_weekly_acc
      : Prisma.ModelName.client_allocator_distribution_weekly;

    const allocatorCountResult = await this.prismaService.$queryRaw<
      [
        {
          count: number;
        },
      ]
    >`select count(distinct allocator)::int
      from ${modelName(clientAllocatorDistributionWeeklyTable)}`;

    const query = isAccumulative
      ? getAllocatorBiggestClientDistributionAcc
      : getAllocatorBiggestClientDistribution;

    return await this.histogramHelper.getWeeklyHistogramResult(
      await this.prismaService.$queryRawTyped(query()),
      allocatorCountResult[0].count,
    );
  }

  public async getAllocatorSpsComplianceHistogram(
    isAccumulative: boolean,
  ): Promise<SpsComplianceHistogramWeekResponseDto> {
    const allocatorCount = await this.getAllocatorCount(isAccumulative);

    const { results } = await this.getAllocatorSpsCompliance(isAccumulative);

    return new SpsComplianceHistogramWeekResponseDto([
      await this.calculateSpsComplianceWeek(
        results,
        allocatorCount,
        ProviderComplianceScoreRange.NonCompliant,
      ),
      await this.calculateSpsComplianceWeek(
        results,
        allocatorCount,
        ProviderComplianceScoreRange.PartiallyCompliant,
      ),
      await this.calculateSpsComplianceWeek(
        results,
        allocatorCount,
        ProviderComplianceScoreRange.Compliant,
      ),
    ]);
  }

  // TODO cache?
  public async getAllocatorSpsCompliance(
    isAccumulative: boolean,
  ): Promise<SpsComplianceWeekResponseDto> {
    const weeks =
      await this.storageProviderService.getWeeksTracked(isAccumulative);

    const result: SpsComplianceWeekDto[] = [];

    for (const week of weeks) {
      const thisWeekAverageRetrievability =
        await this.storageProviderService.getWeekAverageProviderRetrievability(
          week,
          isAccumulative,
        );

      const weekProviders = await this.storageProviderService.getWeekProviders(
        week,
        isAccumulative,
      );

      const weekProvidersCompliance = weekProviders.map((wp) => {
        return this.storageProviderService.getWeekProviderComplianceScore(
          wp,
          thisWeekAverageRetrievability,
        );
      });

      const weekAllocatorsWithClients = await this.getWeekAllocatorsWithClients(
        week,
        isAccumulative,
      );

      const byAllocators = groupBy(
        weekAllocatorsWithClients,
        (a) => a.allocator,
      );

      const weekResult: SpsComplianceSingleAllocatorDto[] = [];

      for (const allocator in byAllocators) {
        const _weekProvidersForAllocator =
          await this.storageProviderService.getWeekProvidersForClients(
            week,
            isAccumulative,
            byAllocators[allocator].map((p) => p.client),
          );

        const weekProvidersForAllocator = [
          ...new Set(_weekProvidersForAllocator),
        ];

        weekResult.push({
          id: allocator,
          ...this.storageProviderService.getCompliantProvidersPercentage(
            weekProvidersCompliance,
            weekProvidersForAllocator,
          ),
        });
      }

      result.push({
        week: week,
        allocators: weekResult,
        total: weekResult.length,
      });
    }

    return new SpsComplianceWeekResponseDto(result);
  }

  private async getAllocatorCount(isAccumulative: boolean): Promise<number> {
    return (
      await (
        (isAccumulative
          ? this.prismaService.allocators_weekly_acc
          : this.prismaService.allocators_weekly) as any
      ).findMany({
        distinct: ['allocator'],
        select: {
          allocator: true,
        },
      })
    ).length;
  }

  private async getWeekAverageAllocatorRetrievability(
    week: Date,
    isAccumulative: boolean,
  ): Promise<number> {
    return (
      await (
        (isAccumulative
          ? this.prismaService.allocators_weekly_acc
          : this.prismaService.allocators_weekly) as any
      ).aggregate({
        _avg: {
          avg_weighted_retrievability_success_rate: true,
        },
        where: {
          week: week,
        },
      })
    )._avg.avg_weighted_retrievability_success_rate;
  }

  private async getWeekAllocatorsWithClients(
    week: Date,
    isAccumulative: boolean,
  ) {
    return (
      (isAccumulative
        ? this.prismaService.client_allocator_distribution_weekly_acc
        : this.prismaService.client_allocator_distribution_weekly) as any
    ).findMany({
      where: {
        week: week,
      },
      select: {
        client: true,
        allocator: true,
      },
    });
  }

  private async calculateSpsComplianceWeek(
    calculationResults: SpsComplianceWeekDto[],
    allocatorCount: number,
    providerComplianceScoreRange: ProviderComplianceScoreRange,
  ) {
    return SpsComplianceHistogramWeekDto.of(
      providerComplianceScoreRange,
      await this.histogramHelper.getWeeklyHistogramResult(
        this.getSpsComplianceBuckets(
          calculationResults,
          providerComplianceScoreRange,
        ),
        allocatorCount,
      ),
    );
  }

  private getSpsComplianceBuckets(
    unsortedResults: SpsComplianceWeekDto[],
    providerComplianceScoreRange: ProviderComplianceScoreRange,
  ): {
    valueFromExclusive: number | null;
    valueToInclusive: number | null;
    count: number | null;
    week: Date;
  }[] {
    let valueFromExclusive = -5;

    const result: {
      valueFromExclusive: number | null;
      valueToInclusive: number | null;
      count: number | null;
      week: Date;
    }[] = [];

    do {
      result.push(
        ...unsortedResults.map((r) => {
          const count = r.allocators.filter(
            (p) =>
              this.getPercentValue(p, providerComplianceScoreRange) >
                valueFromExclusive &&
              this.getPercentValue(p, providerComplianceScoreRange) <=
                valueFromExclusive + 5,
          ).length;

          return {
            valueFromExclusive: valueFromExclusive,
            valueToInclusive: valueFromExclusive + 5,
            week: r.week,
            count: count,
          };
        }),
      );

      valueFromExclusive += 5;
    } while (valueFromExclusive < 95);

    return result;
  }

  private getPercentValue(
    result: {
      nonCompliantSpsPercentage: number;
      partiallyCompliantSpsPercentage: number;
      compliantSpsPercentage: number;
    },
    providerComplianceScoreRange: ProviderComplianceScoreRange,
  ) {
    switch (providerComplianceScoreRange) {
      case ProviderComplianceScoreRange.NonCompliant:
        return result.nonCompliantSpsPercentage;

      case ProviderComplianceScoreRange.PartiallyCompliant:
        return result.partiallyCompliantSpsPercentage;

      case ProviderComplianceScoreRange.Compliant:
        return result.compliantSpsPercentage;
    }
  }
}
