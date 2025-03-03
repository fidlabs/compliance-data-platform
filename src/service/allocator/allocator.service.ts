import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import {
  getAllocatorBiggestClientDistribution,
  getAllocatorBiggestClientDistributionAcc,
  getAllocatorRetrievability,
  getAllocatorRetrievabilityAcc,
  getAllocatorClientsWeekly,
  getAllocatorClientsWeeklyAcc,
} from 'prisma/generated/client/sql';
import { groupBy } from 'lodash';
import { DateTime } from 'luxon';
import { StorageProviderService } from '../storage-provider/storage-provider.service';
import {
  AllocatorSpsComplianceWeek,
  AllocatorSpsComplianceWeekResponse,
  AllocatorSpsComplianceWeekSingle,
} from './types.allocator';
import { HistogramHelperService } from '../histogram-helper/histogram-helper.service';
import {
  HistogramWeekFlat,
  HistogramWeekResponse,
  RetrievabilityHistogramWeek,
  RetrievabilityHistogramWeekResponse,
  RetrievabilityWeekResponse,
} from '../histogram-helper/types.histogram-helper';
import { modelName } from 'src/utils/prisma';
import { Prisma } from 'prisma/generated/client';

@Injectable()
export class AllocatorService {
  private readonly logger = new Logger(AllocatorService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly histogramHelper: HistogramHelperService,
    private readonly storageProviderService: StorageProviderService,
  ) {}

  public async getAllocatorClientsWeekly(
    isAccumulative: boolean,
  ): Promise<HistogramWeekResponse> {
    const query = isAccumulative
      ? getAllocatorClientsWeeklyAcc
      : getAllocatorClientsWeekly;

    return new HistogramWeekResponse(
      await this.getAllocatorCount(),
      await this.histogramHelper.getWeeklyHistogramResult(
        await this.prismaService.$queryRawTyped(query()),
      ),
    );
  }

  public async getAllocatorRetrievabilityWeekly(
    isAccumulative: boolean,
  ): Promise<RetrievabilityWeekResponse> {
    const lastWeek = DateTime.now()
      .toUTC()
      .minus({ week: 1 })
      .startOf('week')
      .toJSDate();

    const lastWeekAverageRetrievability =
      await this.getWeekAverageAllocatorRetrievability(
        lastWeek,
        isAccumulative,
      );

    const query = isAccumulative
      ? getAllocatorRetrievabilityAcc
      : getAllocatorRetrievability;

    const queryResult: HistogramWeekFlat[] =
      await this.prismaService.$queryRawTyped(query());

    if (!queryResult || queryResult.length === 0 || !queryResult[0]) {
      this.logger.error(
        `Database getAllocatorRetrievability${isAccumulative ? 'Acc' : ''} query returned no results, this should not happen: ${queryResult}`,
      );
    }

    const weeklyHistogramResult =
      await this.histogramHelper.getWeeklyHistogramResult(queryResult, 100);

    return new RetrievabilityWeekResponse(
      lastWeekAverageRetrievability * 100,
      new RetrievabilityHistogramWeekResponse(
        await this.getAllocatorCount(),
        await Promise.all(
          weeklyHistogramResult.map(async (histogramWeek) =>
            RetrievabilityHistogramWeek.of(
              histogramWeek,
              (await this.getWeekAverageAllocatorRetrievability(
                histogramWeek.week,
                isAccumulative,
              )) * 100,
            ),
          ),
        ),
      ),
    );
  }

  public async getAllocatorBiggestClientDistributionWeekly(
    isAccumulative: boolean,
  ): Promise<HistogramWeekResponse> {
    const query = isAccumulative
      ? getAllocatorBiggestClientDistributionAcc
      : getAllocatorBiggestClientDistribution;

    return new HistogramWeekResponse(
      await this.getAllocatorCount(),
      await this.histogramHelper.getWeeklyHistogramResult(
        await this.prismaService.$queryRawTyped(query()),
        100,
      ),
    );
  }

  public async getAllocatorSpsComplianceWeekly(
    isAccumulative: boolean,
  ): Promise<AllocatorSpsComplianceWeekResponse> {
    const weeks = await this.storageProviderService.getWeeksTracked();

    const lastWeekAverageProviderRetrievability =
      await this.storageProviderService.getLastWeekAverageProviderRetrievability(
        isAccumulative,
      );

    const results: AllocatorSpsComplianceWeek[] = [];

    for (const week of weeks) {
      const weekAverageProvidersRetrievability =
        await this.storageProviderService.getWeekAverageProviderRetrievability(
          week,
          isAccumulative,
        );

      const weekProviders = await this.storageProviderService.getWeekProviders(
        week,
        isAccumulative,
      );

      const weekProvidersCompliance: {
        // TODO refactor to a type
        complianceScore: number;
        provider: string;
      }[] = weekProviders.map((provider) => {
        return this.storageProviderService.getWeekProviderComplianceScore(
          provider,
          weekAverageProvidersRetrievability,
        );
      });

      const weekAllocatorsWithClients = await this.getWeekAllocatorsWithClients(
        week,
        isAccumulative,
      );

      const clientsByAllocator = groupBy(
        weekAllocatorsWithClients,
        (a) => a.allocator,
      );

      const weekAllocators: AllocatorSpsComplianceWeekSingle[] =
        await Promise.all(
          Object.entries(clientsByAllocator).map(
            // prettier-ignore
            async ([allocator, clients]): Promise<AllocatorSpsComplianceWeekSingle> => {
            const weekProvidersForAllocator =
              await this.storageProviderService.getWeekProvidersForClients(
                week,
                isAccumulative,
                clients.map((p) => p.client),
              );

            return {
              id: allocator,
              totalDatacap: await this.getWeekAllocatorTotalDatacap(
                week,
                isAccumulative,
                allocator,
              ),
              ...this.storageProviderService.getProviderComplianceWeekPercentage(
                weekProvidersCompliance,
                weekProvidersForAllocator.map((p) => p.provider),
              ),
              totalSps: weekProvidersForAllocator.length,
            };
          },
          ),
        );

      results.push({
        week: week,
        averageSuccessRate: weekAverageProvidersRetrievability * 100,
        total: weekAllocators.length,
        allocators: weekAllocators,
      });
    }

    return new AllocatorSpsComplianceWeekResponse(
      lastWeekAverageProviderRetrievability * 100,
      this.histogramHelper.withoutCurrentWeek(
        this.histogramHelper.sorted(results),
      ),
    );
  }

  public async getWeekAllocatorTotalDatacap(
    week: Date,
    isAccumulative: boolean,
    allocatorId: string,
  ): Promise<number> {
    return Number(
      (
        await (
          (isAccumulative
            ? this.prismaService.allocators_weekly_acc
            : this.prismaService.allocators_weekly) as any
        ).aggregate({
          _sum: {
            total_sum_of_allocations: true,
          },
          where: {
            allocator: allocatorId,
            week: week,
          },
        })
      )._sum.total_sum_of_allocations,
    );
  }

  public async getAllocatorCount(): Promise<number> {
    return (
      await this.prismaService.$queryRaw<
        [
          {
            count: number;
          },
        ]
      >`select count(distinct allocator)::int
      from ${modelName(Prisma.ModelName.allocators_weekly_acc)}`
    )[0].count;
  }

  // returns 0 - 1
  public async getWeekAverageAllocatorRetrievability(
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

  public async getWeekAllocatorsWithClients(
    week: Date,
    isAccumulative: boolean,
  ): Promise<{ client: string; allocator: string }[]> {
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
}
