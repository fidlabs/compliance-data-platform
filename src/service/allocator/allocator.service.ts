import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import {
  getAllocatorBiggestClientDistribution,
  getAllocatorRetrievability,
  getAllocatorBiggestClientDistributionAcc,
  getAllocatorRetrievabilityAcc,
} from '../../../prisma/generated/client/sql';
import { HistogramHelper } from '../../helper/histogram.helper';
import { RetrievabilityWeekResponseDto } from '../../types/retrievabilityWeekResponse.dto';
import { groupBy } from 'lodash';
import { ProviderComplianceScoreRange } from '../../types/providerComplianceScoreRange';
import { SpsComplianceWeekResponseDto } from '../../types/spsComplianceWeekResponse.dto';
import { SpsComplianceWeekDto } from '../../types/spsComplianceWeek.dto';
import { DateTime } from 'luxon';
import { Prisma } from 'prisma/generated/client';
import { modelName } from 'src/helper/prisma.helper';
import { HistogramWeekResponseDto } from '../../types/histogramWeek.response.dto';

@Injectable()
export class AllocatorService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly histogramHelper: HistogramHelper,
  ) {}

  async getAllocatorRetrievability(
    isAccumulative: boolean,
  ): Promise<RetrievabilityWeekResponseDto> {
    const lastWeek = DateTime.now()
      .toUTC()
      .minus({ week: 1 })
      .startOf('week')
      .toJSDate();

    const averageSuccessRate = isAccumulative
      ? await this.prismaService.allocators_weekly_acc.aggregate({
          _avg: {
            avg_weighted_retrievability_success_rate: true,
          },
          where: {
            week: lastWeek,
          },
        })
      : await this.prismaService.allocators_weekly.aggregate({
          _avg: {
            avg_weighted_retrievability_success_rate: true,
          },
          where: {
            week: lastWeek,
          },
        });

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
      averageSuccessRate._avg.avg_weighted_retrievability_success_rate * 100,
      weeklyHistogramResult,
    );
  }

  async getAllocatorBiggestClientDistribution(
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

  async getAllocatorSpsCompliance(
    isAccumulative: boolean,
  ): Promise<SpsComplianceWeekResponseDto> {
    const weeks = isAccumulative
      ? await this.prismaService.providers_weekly_acc
          .findMany({
            distinct: ['week'],
            select: {
              week: true,
            },
          })
          .then((r) => r.map((p) => p.week))
      : await this.prismaService.providers_weekly
          .findMany({
            distinct: ['week'],
            select: {
              week: true,
            },
          })
          .then((r) => r.map((p) => p.week));

    const allocatorCount = (
      isAccumulative
        ? await this.prismaService.allocators_weekly_acc.findMany({
            distinct: ['allocator'],
            select: {
              allocator: true,
            },
          })
        : await this.prismaService.allocators_weekly.findMany({
            distinct: ['allocator'],
            select: {
              allocator: true,
            },
          })
    ).length;

    const calculationResults: {
      results: {
        zeroCompliantProvidersPercent: number;
        oneOrTwoCompliantProvidersPercent: number;
        threeCompliantProvidersPercent: number;
      }[];
      week: Date;
    }[] = [];

    for (const week of weeks) {
      const thisWeekAverageRetrievability = isAccumulative
        ? await this.prismaService.providers_weekly_acc.aggregate({
            _avg: {
              avg_retrievability_success_rate: true,
            },
            where: {
              week: week,
            },
          })
        : await this.prismaService.providers_weekly.aggregate({
            _avg: {
              avg_retrievability_success_rate: true,
            },
            where: {
              week: week,
            },
          });

      const weekProviders = isAccumulative
        ? await this.prismaService.providers_weekly_acc.findMany({
            where: {
              week: week,
            },
          })
        : await this.prismaService.providers_weekly.findMany({
            where: {
              week: week,
            },
          });

      const weekProvidersCompliance = weekProviders.map((wp) => {
        let complianceScore = 0;
        if (
          wp.avg_retrievability_success_rate >
          thisWeekAverageRetrievability._avg.avg_retrievability_success_rate
        )
          complianceScore++;
        if (wp.num_of_clients > 3) complianceScore++;
        if (
          wp.biggest_client_total_deal_size * 100n <=
          30n * wp.total_deal_size
        )
          complianceScore++;

        return {
          provider: wp.provider,
          complianceScore: complianceScore,
        };
      });

      const weekAllocatorsWithClients = isAccumulative
        ? await this.prismaService.client_allocator_distribution_weekly_acc.findMany(
            {
              where: {
                week: week,
              },
              select: {
                client: true,
                allocator: true,
              },
            },
          )
        : await this.prismaService.client_allocator_distribution_weekly.findMany(
            {
              where: {
                week: week,
              },
              select: {
                client: true,
                allocator: true,
              },
            },
          );

      const byAllocators = groupBy(
        weekAllocatorsWithClients,
        (a) => a.allocator,
      );

      const weekResult: {
        allocator: string;
        zeroCompliantProvidersPercent: number;
        oneOrTwoCompliantProvidersPercent: number;
        threeCompliantProvidersPercent: number;
      }[] = [];
      for (const allocator in byAllocators) {
        const clients = byAllocators[allocator].map((p) => p.client);

        const providers = isAccumulative
          ? await this.prismaService.client_provider_distribution_weekly_acc
              .findMany({
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
              .then((r) => r.map((p) => p.provider))
          : await this.prismaService.client_provider_distribution_weekly
              .findMany({
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
              .then((r) => r.map((p) => p.provider));

        weekResult.push({
          allocator: allocator,
          zeroCompliantProvidersPercent:
            this.getAllocatorCompliantProvidersPercentage(
              weekProvidersCompliance,
              providers,
              ProviderComplianceScoreRange.Zero,
            ),
          oneOrTwoCompliantProvidersPercent:
            this.getAllocatorCompliantProvidersPercentage(
              weekProvidersCompliance,
              providers,
              ProviderComplianceScoreRange.OneOrTwo,
            ),
          threeCompliantProvidersPercent:
            this.getAllocatorCompliantProvidersPercentage(
              weekProvidersCompliance,
              providers,
              ProviderComplianceScoreRange.Three,
            ),
        });
      }

      calculationResults.push({
        week: week,
        results: weekResult,
      });
    }

    return new SpsComplianceWeekResponseDto([
      await this.calculateSpsComplianceWeekDto(
        calculationResults,
        allocatorCount,
        ProviderComplianceScoreRange.Zero,
      ),
      await this.calculateSpsComplianceWeekDto(
        calculationResults,
        allocatorCount,
        ProviderComplianceScoreRange.OneOrTwo,
      ),
      await this.calculateSpsComplianceWeekDto(
        calculationResults,
        allocatorCount,
        ProviderComplianceScoreRange.Three,
      ),
    ]);
  }

  private async calculateSpsComplianceWeekDto(
    calculationResults: {
      results: {
        zeroCompliantProvidersPercent: number;
        oneOrTwoCompliantProvidersPercent: number;
        threeCompliantProvidersPercent: number;
      }[];
      week: Date;
    }[],
    allocatorCount: number,
    providerComplianceScoreRange: ProviderComplianceScoreRange,
  ) {
    return SpsComplianceWeekDto.of(
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
    unsortedResults: {
      results: {
        zeroCompliantProvidersPercent: number;
        oneOrTwoCompliantProvidersPercent: number;
        threeCompliantProvidersPercent: number;
      }[];
      week: Date;
    }[],
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
          const count = r.results.filter(
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
      zeroCompliantProvidersPercent: number;
      oneOrTwoCompliantProvidersPercent: number;
      threeCompliantProvidersPercent: number;
    },
    providerComplianceScoreRange: ProviderComplianceScoreRange,
  ) {
    switch (providerComplianceScoreRange) {
      case ProviderComplianceScoreRange.Zero:
        return result.zeroCompliantProvidersPercent;
      case ProviderComplianceScoreRange.OneOrTwo:
        return result.oneOrTwoCompliantProvidersPercent;
      case ProviderComplianceScoreRange.Three:
        return result.threeCompliantProvidersPercent;
    }
  }

  private getAllocatorCompliantProvidersPercentage(
    weekProvidersCompliance: {
      complianceScore: number;
      provider: string;
    }[],
    providers: string[],
    complianceScore: ProviderComplianceScoreRange,
  ) {
    const validComplianceScores: number[] = [];
    switch (complianceScore) {
      case ProviderComplianceScoreRange.Zero:
        validComplianceScores.push(0);
        break;
      case ProviderComplianceScoreRange.OneOrTwo:
        validComplianceScores.push(1, 2);
        break;
      case ProviderComplianceScoreRange.Three:
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
