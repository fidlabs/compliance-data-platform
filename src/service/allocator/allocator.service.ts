import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import {
  getAllocatorBiggestClientDistribution,
  getAllocatorRetrievability,
  getAllocatorBiggestClientDistributionAcc,
  getAllocatorRetrievabilityAcc,
} from '../../../prisma/generated/client/sql';
import { groupBy } from 'lodash';
import { DateTime } from 'luxon';
import { Prisma } from 'prisma/generated/client';
import { modelName } from 'src/utils/prisma';
import { StorageProviderService } from '../storage-provider/storage-provider.service';
import {
  AllocatorComplianceHistogramWeek,
  AllocatorComplianceHistogramWeekResponse,
  AllocatorComplianceWeekSingle,
  AllocatorComplianceWeek,
  AllocatorComplianceWeekResponse,
} from './types.allocator';
import {
  ProviderComplianceScoreRange,
  StorageProviderComplianceWeekPercentage,
} from '../storage-provider/types.storage-provider';
import { HistogramHelperService } from '../histogram-helper/histogram-helper.service';
import {
  HistogramWeekResponse,
  RetrievabilityWeekResponse,
} from '../histogram-helper/types.histogram-helper';

@Injectable()
export class AllocatorService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly histogramHelper: HistogramHelperService,
    private readonly storageProviderService: StorageProviderService,
  ) {}

  public async getAllocatorRetrievability(
    isAccumulative: boolean,
  ): Promise<RetrievabilityWeekResponse> {
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

    return RetrievabilityWeekResponse.of(
      averageSuccessRate * 100,
      weeklyHistogramResult,
    );
  }

  public async getAllocatorBiggestClientDistribution(
    isAccumulative: boolean,
  ): Promise<HistogramWeekResponse> {
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

  public async getAllocatorComplianceHistogram(
    isAccumulative: boolean,
  ): Promise<AllocatorComplianceHistogramWeekResponse> {
    const allocatorCount = await this.getAllocatorCount(isAccumulative);

    const { results } = await this.getAllocatorCompliance(isAccumulative);

    return new AllocatorComplianceHistogramWeekResponse([
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

  public async getAllocatorCompliance(
    isAccumulative: boolean,
  ): Promise<AllocatorComplianceWeekResponse> {
    const weeks =
      await this.storageProviderService.getWeeksTracked(isAccumulative);

    const result: AllocatorComplianceWeek[] = [];

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

      const weekResult: AllocatorComplianceWeekSingle[] = await Promise.all(
        Object.entries(byAllocators).map(async ([allocator, clients]) => {
          const weekProvidersForAllocator =
            await this.storageProviderService.getWeekProvidersForClients(
              week,
              isAccumulative,
              clients.map((p) => p.client),
            );

          return {
            id: allocator,
            ...this.storageProviderService.getCompliantProvidersPercentage(
              weekProvidersCompliance,
              weekProvidersForAllocator,
            ),
          };
        }),
      );

      result.push({
        week: week,
        allocators: weekResult,
        total: weekResult.length,
      });
    }

    return new AllocatorComplianceWeekResponse(result);
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
    calculationResults: AllocatorComplianceWeek[],
    allocatorCount: number,
    providerComplianceScoreRange: ProviderComplianceScoreRange,
  ) {
    return AllocatorComplianceHistogramWeek.of(
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
    unsortedResults: AllocatorComplianceWeek[],
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
    data: StorageProviderComplianceWeekPercentage,
    providerComplianceScoreRange: ProviderComplianceScoreRange,
  ): number {
    switch (providerComplianceScoreRange) {
      case ProviderComplianceScoreRange.NonCompliant:
        return data.nonCompliantSpsPercentage;

      case ProviderComplianceScoreRange.PartiallyCompliant:
        return data.partiallyCompliantSpsPercentage;

      case ProviderComplianceScoreRange.Compliant:
        return data.compliantSpsPercentage;
    }
  }
}
