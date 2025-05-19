import { Prisma } from 'prisma/generated/client';
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
import { ConfigService } from '@nestjs/config';
import { lastWeek } from 'src/utils/utils';

@Injectable()
export class AllocatorService {
  private readonly logger = new Logger(AllocatorService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly prismaDmobService: PrismaDmobService,
    private readonly histogramHelper: HistogramHelperService,
    private readonly storageProviderService: StorageProviderService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Cacheable({ ttl: 1000 * 60 * 30 }) // 30 minutes
  public async getAllocators(returnInactive = true) {
    const allocators = await this.prismaDmobService.$queryRawTyped(
      getAllocatorsFull(returnInactive),
    );

    const jsonLinks = await this.prismaService.allocator_registry.findMany({
      select: {
        id: true,
        json_path: true,
      },
    });

    const jsonLinksMap = jsonLinks.reduce((acc, v) => {
      acc[v.id] = v.json_path;
      return acc;
    }, {});

    const owner = this.configService.get<string>(
      'ALLOCATOR_REGISTRY_REPO_OWNER',
    );

    const name = this.configService.get<string>('ALLOCATOR_REGISTRY_REPO_NAME');
    const urlBase = `https://github.com/${owner}/${name}/blob/main`;

    return allocators.map((allocator) => {
      const path = jsonLinksMap[allocator.addressId];
      const application_json_url = path ? `${urlBase}/${path}` : null;
      return {
        application_json_url,
        ...allocator,
      };
    });
  }

  public async getStandardAllocatorClientsWeekly(
    isAccumulative: boolean,
  ): Promise<HistogramWeekResponse> {
    return new HistogramWeekResponse(
      await this.getStandardAllocatorCount(),
      await this.histogramHelper.getWeeklyHistogramResult(
        await this.prismaService.$queryRawTyped(
          isAccumulative
            ? getStandardAllocatorClientsWeeklyAcc()
            : getStandardAllocatorClientsWeekly(),
        ),
      ),
    );
  }

  private async _getStandardAllocatorRetrievability(
    isAccumulative: boolean,
    openDataOnly = true,
  ): Promise<HistogramWeekFlat[]> {
    return await this.prismaService.$queryRawTyped(
      isAccumulative
        ? getStandardAllocatorRetrievabilityAcc(openDataOnly)
        : getStandardAllocatorRetrievability(openDataOnly),
    );
  }

  public async getStandardAllocatorRetrievabilityWeekly(
    isAccumulative: boolean,
    openDataOnly = true,
  ): Promise<RetrievabilityWeekResponse> {
    const lastWeekAverageRetrievability =
      await this.getWeekAverageStandardAllocatorRetrievability(
        lastWeek(),
        isAccumulative,
        openDataOnly,
      );

    const result = await this._getStandardAllocatorRetrievability(
      isAccumulative,
      openDataOnly,
    );

    const weeklyHistogramResult =
      await this.histogramHelper.getWeeklyHistogramResult(result, 100);

    return new RetrievabilityWeekResponse(
      lastWeekAverageRetrievability * 100,
      new RetrievabilityHistogramWeekResponse(
        await this.getStandardAllocatorCount(openDataOnly),
        await Promise.all(
          weeklyHistogramResult.map(async (histogramWeek) =>
            RetrievabilityHistogramWeek.of(
              histogramWeek,
              (await this.getWeekAverageStandardAllocatorRetrievability(
                histogramWeek.week,
                isAccumulative,
                openDataOnly,
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
    return new HistogramWeekResponse(
      await this.getStandardAllocatorCount(),
      await this.histogramHelper.getWeeklyHistogramResult(
        await this.prismaService.$queryRawTyped(
          isAccumulative
            ? getStandardAllocatorBiggestClientDistributionAcc()
            : getStandardAllocatorBiggestClientDistribution(),
        ),
        100,
      ),
    );
  }

  public calculateAllocatorComplianceScore(
    weekAllocator: AllocatorSpsComplianceWeekSingle,
    complianceThresholdPercentage: number,
  ): AllocatorComplianceScore {
    let complianceScore: AllocatorComplianceScoreRange;

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
      spMetricsToCheck,
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
  public async getStandardAllocatorCount(
    openDataOnly = false,
  ): Promise<number> {
    return (
      await this.prismaService.$queryRawTyped(
        getStandardAllocatorCount(openDataOnly),
      )
    )[0].count;
  }

  // returns 0 - 1
  public async getWeekAverageStandardAllocatorRetrievability(
    week: Date,
    isAccumulative: boolean,
    openDataOnly = true,
  ): Promise<number> {
    return (
      await this.prismaService.$queryRawTyped(
        isAccumulative
          ? getWeekAverageStandardAllocatorRetrievabilityAcc(openDataOnly, week)
          : getWeekAverageStandardAllocatorRetrievability(openDataOnly, week),
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

  public async getAllocatorRegistryInfo(allocatorIdOrAddress: string) {
    const result = await this.prismaService.allocator_registry.findFirst({
      where: {
        OR: [
          {
            address: allocatorIdOrAddress,
          },
          {
            id: allocatorIdOrAddress,
          },
        ],
      },
    });

    if (!result) return;

    const info = result.registry_info as Prisma.JsonObject;
    const application = info.application as Prisma.JsonObject;
    const data_types = (application?.data_types as Prisma.JsonArray)?.map(
      (v) => v as string,
    );

    // parse it into somewhat coherent type
    return {
      application: {
        data_types,
        required_sps: application.required_sps as string,
        required_replicas: application.required_replicas as string,
      },
    };
  }
}
