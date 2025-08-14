import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { groupBy } from 'lodash';
import { Prisma } from 'prisma/generated/client';
import {
  getAverageSecondsToFirstDeal,
  getStandardAllocatorBiggestClientDistributionAcc,
  getStandardAllocatorClientsWeeklyAcc,
  getStandardAllocatorCount,
  getStandardAllocatorRetrievabilityAcc,
  getWeekAverageStandardAllocatorRetrievabilityAcc,
} from 'prisma/generated/client/sql';
import { getAllocatorsFull } from 'prismaDmob/generated/client/sql';
import { PrismaService } from 'src/db/prisma.service';
import { PrismaDmobService } from 'src/db/prismaDmob.service';
import { Cacheable } from 'src/utils/cacheable';
import {
  DEFAULT_FILPLUS_EDITION_ID,
  getAllocatorRegistryModelByFilPlusEdition,
  getCurrentFilPlusEdition,
  getFilPlusEditionByNumber,
  getFilPlusEditionWithDateTimeRange,
} from 'src/utils/filplus-edition';
import { getLastWeekBeforeTimestamp, lastWeek } from 'src/utils/utils';
import { HistogramHelperService } from '../histogram-helper/histogram-helper.service';
import {
  HistogramWeekFlat,
  HistogramWeekResponse,
  RetrievabilityHistogramWeek,
  RetrievabilityHistogramWeekResponse,
  RetrievabilityWeekResponse,
} from '../histogram-helper/types.histogram-helper';
import { StorageProviderService } from '../storage-provider/storage-provider.service';
import {
  StorageProviderComplianceMetrics,
  StorageProviderComplianceScore,
} from '../storage-provider/types.storage-provider';
import {
  AllocatorComplianceScore,
  AllocatorComplianceScoreRange,
  AllocatorSpsComplianceWeek,
  AllocatorSpsComplianceWeekResponse,
  AllocatorSpsComplianceWeekSingle,
} from './types.allocator';

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
  public async getAllocators(
    returnInactive = true,
    isMetaallocator: boolean | null = null,
    filter: string | null = null,
    usingMetaallocatorId: string | null = null,
    roundId = DEFAULT_FILPLUS_EDITION_ID,
  ) {
    const editionDate = getFilPlusEditionWithDateTimeRange(roundId);
    const allocatorRegistry =
      getAllocatorRegistryModelByFilPlusEdition(roundId);

    const allocators = await this.prismaDmobService.$queryRawTyped(
      getAllocatorsFull(
        returnInactive,
        isMetaallocator,
        filter,
        usingMetaallocatorId,
        editionDate.startDate,
        editionDate.endDate,
      ),
    );

    const registryInfo = await this.prismaService[allocatorRegistry].findMany({
      select: {
        allocator_id: true,
        json_path: true,
        registry_info: true,
        active: true,
      },
      where: {
        active: !returnInactive,
      },
    });

    const jsonLinksMap = jsonLinks.reduce((acc, v) => {
      acc[v.allocator_id] = v.json_path;
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
    roundId = DEFAULT_FILPLUS_EDITION_ID,
  ): Promise<HistogramWeekResponse> {
    const editionDate = getFilPlusEditionWithDateTimeRange(roundId);

    return new HistogramWeekResponse(
      await this.getStandardAllocatorCount(
        false,
        editionDate.startDate,
        editionDate.endDate,
      ),
      await this.histogramHelper.getWeeklyHistogramResult(
        await this.prismaService.$queryRawTyped(
          getStandardAllocatorClientsWeeklyAcc(
            editionDate.startDate,
            editionDate.endDate,
          ),
        ),
      ),
    );
  }

  private async _getStandardAllocatorRetrievability(
    openDataOnly = true,
    httpRetrievability = true,
    startEditionDate?: Date,
    endEditionDate?: Date,
  ): Promise<HistogramWeekFlat[]> {
    return await this.prismaService.$queryRawTyped(
      getStandardAllocatorRetrievabilityAcc(
        openDataOnly,
        httpRetrievability,
        startEditionDate,
        endEditionDate,
      ),
    );
  }

  public async getStandardAllocatorRetrievabilityWeekly(
    openDataOnly = true,
    httpRetrievability = true,
    roundId = DEFAULT_FILPLUS_EDITION_ID,
  ): Promise<RetrievabilityWeekResponse> {
    const editionData = roundId
      ? getFilPlusEditionByNumber(roundId)
      : getCurrentFilPlusEdition();

    if (!editionData) {
      throw new BadRequestException(`Invalid program round ID: ${roundId}`);
    }

    const isCurrentRound = editionData.isCurrent;

    const lastWeekAverageRetrievability = isCurrentRound
      ? await this.getWeekAverageStandardAllocatorRetrievability(
          lastWeek(),
          openDataOnly,
          httpRetrievability,
        )
      : await this.getWeekAverageStandardAllocatorRetrievability(
          getLastWeekBeforeTimestamp(editionData.endTimestamp),
          openDataOnly,
          httpRetrievability,
        );

    const result = await this._getStandardAllocatorRetrievability(
      openDataOnly,
      httpRetrievability,
      editionData.startDate,
      editionData.endDate,
    );

    const weeklyHistogramResult =
      await this.histogramHelper.getWeeklyHistogramResult(result, 100);

    return new RetrievabilityWeekResponse(
      lastWeekAverageRetrievability * 100,
      new RetrievabilityHistogramWeekResponse(
        await this.getStandardAllocatorCount(
          openDataOnly,
          editionData.startDate,
          editionData.endDate,
        ),
        await Promise.all(
          weeklyHistogramResult.map(async (histogramWeek) =>
            RetrievabilityHistogramWeek.of(
              histogramWeek,
              (await this.getWeekAverageStandardAllocatorRetrievability(
                histogramWeek.week,
                openDataOnly,
                httpRetrievability,
              )) * 100,
            ),
          ),
        ),
      ),
    );
  }

  public async getStandardAllocatorBiggestClientDistributionWeekly(
    roundId: number,
  ): Promise<HistogramWeekResponse> {
    const editionDate = getFilPlusEditionWithDateTimeRange(roundId);

    return new HistogramWeekResponse(
      await this.getStandardAllocatorCount(
        false,
        editionDate.startDate,
        editionDate.endDate,
      ),
      await this.histogramHelper.getWeeklyHistogramResult(
        await this.prismaService.$queryRawTyped(
          getStandardAllocatorBiggestClientDistributionAcc(
            editionDate.startDate,
            editionDate.endDate,
          ),
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
    spMetricsToCheck?: StorageProviderComplianceMetrics,
  ): Promise<AllocatorSpsComplianceWeek> {
    const [
      weekAverageProvidersRetrievability,
      weekProviders,
      weekAllocatorsWithClients,
    ] = await Promise.all([
      this.storageProviderService.getWeekAverageProviderRetrievability(week),
      this.storageProviderService.getWeekProviders(week),
      this.getWeekStandardAllocatorsWithClients(week),
    ]);

    const weekProvidersCompliance: StorageProviderComplianceScore[] =
      weekProviders.map((provider) => {
        return this.storageProviderService.calculateProviderComplianceScore(
          provider,
          weekAverageProvidersRetrievability,
          spMetricsToCheck,
        );
      });

    const clientsByAllocator = groupBy(
      weekAllocatorsWithClients,
      (a) => a.allocator,
    );

    const allocatorIds = Object.keys(clientsByAllocator);

    const [weekProvidersForAllocators, totalDatacaps] = await Promise.all([
      this.storageProviderService.getWeekProvidersForClients(
        week,
        allocatorIds,
      ),
      this.prismaService.allocators_weekly_acc.findMany({
        where: {
          allocator: { in: allocatorIds },
          week: week,
        },
        select: {
          allocator: true,
          total_sum_of_allocations: true,
        },
      }),
    ]);

    const totalDatacapMap = totalDatacaps.reduce(
      (acc, item) => {
        acc[item.allocator] = Number(item.total_sum_of_allocations);
        return acc;
      },
      {} as Record<string, number>,
    );

    const weekAllocators: AllocatorSpsComplianceWeekSingle[] = allocatorIds.map(
      (allocator) => {
        const weekProvidersForAllocator =
          weekProvidersForAllocators[allocator] || [];

        return {
          id: allocator,
          totalDatacap: totalDatacapMap[allocator] || 0,
          ...this.storageProviderService.getProvidersCompliancePercentage(
            weekProvidersCompliance,
            weekProvidersForAllocator,
          ),
          totalSps: weekProvidersForAllocator.length,
        };
      },
    );

    // const weekAllocators: AllocatorSpsComplianceWeekSingle[] =
    // await Promise.all(
    //   Object.entries(clientsByAllocator).map(
    //     // prettier-ignore
    //     async ([allocator, clients]): Promise<AllocatorSpsComplianceWeekSingle> => {
    //       const weekProvidersForAllocator =
    //         await this.storageProviderService.getWeekProvidersForClients(
    //           week,
    //           clients.map((p) => p.client),
    //         );

    //       return {
    //         id: allocator,
    //         totalDatacap: await this.getWeekAllocatorTotalDatacap(
    //           week,
    //           allocator,
    //         ),
    //         ...this.storageProviderService.getProvidersCompliancePercentage(
    //           weekProvidersCompliance,
    //           weekProvidersForAllocator,
    //         ),
    //         totalSps: weekProvidersForAllocator.length,
    //       };
    //     },
    //   ),
    // );

    return {
      week: week,
      averageSuccessRate: weekAverageProvidersRetrievability * 100,
      total: weekAllocators.length,
      allocators: weekAllocators,
    };
  }

  // TODO measure and optimize this function
  public async getStandardAllocatorSpsComplianceWeekly(
    spMetricsToCheck?: StorageProviderComplianceMetrics,
  ): Promise<AllocatorSpsComplianceWeekResponse> {
    const editionData = getFilPlusEditionWithDateTimeRange(
      spMetricsToCheck?.roundId,
    );

    const [weeks, lastWeekAverageProviderRetrievability] = await Promise.all([
      this.storageProviderService.getWeeksTracked(
        editionData.startDate,
        editionData.endDate,
      ),
      editionData.isCurrent
        ? this.storageProviderService.getLastWeekAverageProviderRetrievability()
        : this.storageProviderService.getWeekAverageProviderRetrievability(
            getLastWeekBeforeTimestamp(editionData.endTimestamp),
          ),
    ]);

    const results = await Promise.all(
      weeks.map((week) =>
        this.getWeekStandardAllocatorSpsCompliance(week, spMetricsToCheck),
      ),
    );

    //TODO: to verify withoutCurrentWeek
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
    allocatorId: string,
  ): Promise<number> {
    return Number(
      (
        await this.prismaService.allocators_weekly_acc.aggregate({
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
    startWeekDate = new Date(0),
    endWeekDate = new Date('9999-12-31'),
  ): Promise<number> {
    return (
      await this.prismaService.$queryRawTyped(
        getStandardAllocatorCount(openDataOnly, startWeekDate, endWeekDate),
      )
    )[0].count;
  }

  // returns 0 - 1
  public async getWeekAverageStandardAllocatorRetrievability(
    week: Date,
    openDataOnly = true,
    httpRetrievability = true,
  ): Promise<number> {
    return (
      await this.prismaService.$queryRawTyped(
        getWeekAverageStandardAllocatorRetrievabilityAcc(
          openDataOnly,
          httpRetrievability,
          week,
        ),
      )
    )[0].average;
  }

  // assuming client_allocator_distribution_weekly table doesn't contain metaallocators
  // this function returns (client, standard allocator) pairs
  public async getWeekStandardAllocatorsWithClients(
    week: Date,
  ): Promise<{ client: string; allocator: string }[]> {
    return this.prismaService.client_allocator_distribution_weekly_acc.findMany(
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
            allocator_address: allocatorIdOrAddress,
          },
          {
            allocator_id: allocatorIdOrAddress,
          },
        ],
      },
    });

    if (!result) return;

    const info = result.registry_info as Prisma.JsonObject;
    const application = info.application as Prisma.JsonObject;

    const data_types = (application?.data_types as Prisma.JsonArray)?.map((v) =>
      (v as string).trim(),
    );

    const audit = (application?.audit as Prisma.JsonArray)?.map((v) =>
      (v as string).trim(),
    );

    return {
      application: {
        data_types,
        audit,
        required_sps: application.required_sps as string,
        required_replicas: application.required_replicas as string,
      },
    };
  }

  public async getAverageSecondsToFirstDeal(
    allocatorId: string,
  ): Promise<number | null> {
    return Number(
      (
        await this.prismaService.$queryRawTyped(
          getAverageSecondsToFirstDeal(null, allocatorId),
        )
      )?.[0]?.average,
    );
  }

  public async getActiveAllocatorRegistryIdsByFilPlusEdition(
    roundId = DEFAULT_FILPLUS_EDITION_ID,
  ): Promise<string[]> {
    const allocatorRegistry =
      getAllocatorRegistryModelByFilPlusEdition(roundId);

    const allocators = await this.prismaService[allocatorRegistry].findMany({
      where: {
        active: true,
      },
      select: {
        allocator_id: true,
      },
    });
    return allocators.map((a) => a.allocator_id);
  }
}
