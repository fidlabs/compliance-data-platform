import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import {
  getStandardAllocatorBiggestClientDistribution,
  getStandardAllocatorBiggestClientDistributionAcc,
  getStandardAllocatorRetrievability,
  getStandardAllocatorRetrievabilityAcc,
  getStandardAllocatorClientsWeekly,
  getStandardAllocatorClientsWeeklyAcc,
  getStandardAllocatorCount,
  getWeekAverageStandardAllocatorRetrievability,
  getWeekAverageStandardAllocatorRetrievabilityAcc,
} from 'prisma/generated/client/sql';
import { getAllocatorsFull } from 'prismaDmob/generated/client/sql';
import { groupBy } from 'lodash';
import { DateTime } from 'luxon';
import { StorageProviderService } from '../storage-provider/storage-provider.service';
import {
  AllocatorComplianceScore,
  AllocatorComplianceScoreRange,
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
import {
  StorageProviderComplianceMetrics,
  StorageProviderComplianceScore,
} from '../storage-provider/types.storage-provider';
import { PrismaDmobService } from 'src/db/prismaDmob.service';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cacheable } from 'src/utils/cacheable';

@Injectable()
export class AllocatorService {
  private readonly logger = new Logger(AllocatorService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly prismaDmobService: PrismaDmobService,
    private readonly histogramHelper: HistogramHelperService,
    private readonly storageProviderService: StorageProviderService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Cacheable({ ttl: 1000 * 60 * 30 }) // 30 minutes
  public async getAllocators() {
    return this.prismaDmobService.$queryRawTyped(getAllocatorsFull());
  }

  public async getStandardAllocatorClientsWeekly(
    isAccumulative: boolean,
  ): Promise<HistogramWeekResponse> {
    const query = isAccumulative
      ? getStandardAllocatorClientsWeeklyAcc
      : getStandardAllocatorClientsWeekly;

    return new HistogramWeekResponse(
      await this.getStandardAllocatorCount(),
      await this.histogramHelper.getWeeklyHistogramResult(
        await this.prismaService.$queryRawTyped(query()),
      ),
    );
  }

  public async getStandardAllocatorRetrievabilityWeekly(
    isAccumulative: boolean,
  ): Promise<RetrievabilityWeekResponse> {
    const lastWeek = DateTime.now()
      .toUTC()
      .minus({ week: 1 })
      .startOf('week')
      .toJSDate();

    const lastWeekAverageRetrievability =
      await this.getWeekAverageStandardAllocatorRetrievability(
        lastWeek,
        isAccumulative,
      );

    const query = isAccumulative
      ? getStandardAllocatorRetrievabilityAcc
      : getStandardAllocatorRetrievability;

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
        await this.getStandardAllocatorCount(),
        await Promise.all(
          weeklyHistogramResult.map(async (histogramWeek) =>
            RetrievabilityHistogramWeek.of(
              histogramWeek,
              (await this.getWeekAverageStandardAllocatorRetrievability(
                histogramWeek.week,
                isAccumulative,
              )) * 100,
            ),
          ),
        ),
      ),
    );
  }

  public async getStandardAllocatorBiggestClientDistributionWeekly(
    isAccumulative: boolean,
  ): Promise<HistogramWeekResponse> {
    const query = isAccumulative
      ? getStandardAllocatorBiggestClientDistributionAcc
      : getStandardAllocatorBiggestClientDistribution;

    return new HistogramWeekResponse(
      await this.getStandardAllocatorCount(),
      await this.histogramHelper.getWeeklyHistogramResult(
        await this.prismaService.$queryRawTyped(query()),
        100,
      ),
    );
  }

  public calculateAllocatorComplianceScore(
    weekAllocator: AllocatorSpsComplianceWeekSingle,
    complianceThresholdPercentage: number,
  ): AllocatorComplianceScore {
    let complianceScore;

    if (weekAllocator.compliantSpsPercentage >= complianceThresholdPercentage) {
      complianceScore = AllocatorComplianceScoreRange.Compliant;
    } else if (
      weekAllocator.compliantSpsPercentage +
        weekAllocator.partiallyCompliantSpsPercentage >=
      complianceThresholdPercentage
    ) {
      complianceScore = AllocatorComplianceScoreRange.PartiallyCompliant;
    } else {
      complianceScore = AllocatorComplianceScoreRange.NonCompliant;
    }

    return {
      complianceScore: complianceScore,
      allocator: weekAllocator.id,
    };
  }

  public async getWeekStandardAllocatorSpsCompliance(
    week: Date,
    isAccumulative: boolean,
    spMetricsToCheck?: StorageProviderComplianceMetrics,
  ): Promise<AllocatorSpsComplianceWeek> {
    const weekAverageProvidersRetrievability =
      await this.storageProviderService.getWeekAverageProviderRetrievability(
        week,
        isAccumulative,
      );

    const weekProviders = await this.storageProviderService.getWeekProviders(
      week,
      isAccumulative,
    );

    const weekProvidersCompliance: StorageProviderComplianceScore[] =
      weekProviders.map((provider) => {
        return this.storageProviderService.calculateProviderComplianceScore(
          provider,
          weekAverageProvidersRetrievability,
          spMetricsToCheck,
        );
      });

    const weekAllocatorsWithClients =
      await this.getWeekStandardAllocatorsWithClients(week, isAccumulative);

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
                ...this.storageProviderService.getProvidersCompliancePercentage(
                  weekProvidersCompliance,
                  weekProvidersForAllocator,
                ),
                totalSps: weekProvidersForAllocator.length,
              };
            },
        ),
      );

    return {
      week: week,
      averageSuccessRate: weekAverageProvidersRetrievability * 100,
      total: weekAllocators.length,
      allocators: weekAllocators,
    };
  }

  // TODO measure and optimize this function
  public async getStandardAllocatorSpsComplianceWeekly(
    isAccumulative: boolean,
    spMetricsToCheck?: StorageProviderComplianceMetrics,
  ): Promise<AllocatorSpsComplianceWeekResponse> {
    const weeks = await this.storageProviderService.getWeeksTracked();

    const lastWeekAverageProviderRetrievability =
      await this.storageProviderService.getLastWeekAverageProviderRetrievability(
        isAccumulative,
      );

    const results = await Promise.all(
      weeks.map(
        async (week) =>
          await this.getWeekStandardAllocatorSpsCompliance(
            week,
            isAccumulative,
            spMetricsToCheck,
          ),
      ),
    );

    return new AllocatorSpsComplianceWeekResponse(
      {
        retrievability: spMetricsToCheck?.retrievability !== 'false',
        numberOfClients: spMetricsToCheck?.numberOfClients !== 'false',
        totalDealSize: spMetricsToCheck?.totalDealSize !== 'false',
      },
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

  // returns the number of standard allocators (not metaallocators)
  public async getStandardAllocatorCount(): Promise<number> {
    return (
      await this.prismaService.$queryRawTyped(getStandardAllocatorCount())
    )[0].count;
  }

  // returns 0 - 1
  public async getWeekAverageStandardAllocatorRetrievability(
    week: Date,
    isAccumulative: boolean,
  ): Promise<number> {
    return (
      await this.prismaService.$queryRawTyped(
        isAccumulative
          ? getWeekAverageStandardAllocatorRetrievabilityAcc(week)
          : getWeekAverageStandardAllocatorRetrievability(week),
      )
    )[0].average;
  }

  // assuming client_allocator_distribution_weekly table doesn't contain metaallocators
  // this function returns (client, standard allocator) pairs
  public async getWeekStandardAllocatorsWithClients(
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

  public async getAllocatorData(allocatorIdOrAddress: string) {
    return this.prismaDmobService.verifier.findFirst({
      where: {
        OR: [
          {
            address: allocatorIdOrAddress,
          },
          {
            addressId: allocatorIdOrAddress,
          },
        ],
      },
    });
  }
}
