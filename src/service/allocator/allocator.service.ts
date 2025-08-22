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
import {
  getAllocatorDatacapFlowData,
  getAllocatorsFull,
} from 'prismaDmob/generated/client/sql';
import { PrismaService } from 'src/db/prisma.service';
import { PrismaDmobService } from 'src/db/prismaDmob.service';
import { Cacheable } from 'src/utils/cacheable';
import {
  DEFAULT_FILPLUS_EDITION_ID,
  getCurrentFilPlusEdition,
  getFilPlusEditionByNumber,
  getFilPlusEditionWithDateTimeRange,
} from 'src/utils/filplus-edition';
import {
  getLastWeekBeforeTimestamp,
  lastWeek,
  stringToNumber,
} from 'src/utils/utils';
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
  AllocatorDatacapFlowData,
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
  public async getAllocatorRegistryInfoMap() {
    const registryInfo = await this.prismaService.allocator_registry.findMany({
      select: {
        allocator_id: true,
        json_path: true,
        registry_info: true,
      },
    });

    return registryInfo.reduce((acc, v) => {
      acc[v.allocator_id] = v;
      return acc;
    }, {});
  }

  @Cacheable({ ttl: 1000 * 60 * 30 }) // 30 minutes
  public async getAllocators(
    returnInactive = true,
    isMetaallocator?: boolean,
    filter?: string,
    usingMetaallocatorId?: string,
  ) {
    const allocators = await this.prismaDmobService.$queryRawTyped(
      getAllocatorsFull(
        returnInactive,
        isMetaallocator ?? null,
        filter ?? null,
        usingMetaallocatorId ?? null,
      ),
    );

    const registryRepoOwner = this.configService.get<string>(
      'ALLOCATOR_REGISTRY_REPO_OWNER',
    );

    const registryRepoName = this.configService.get<string>(
      'ALLOCATOR_REGISTRY_REPO_NAME',
    );

    const registryRepoUrlBase = `https://github.com/${registryRepoOwner}/${registryRepoName}/blob/main`;
    const registryInfoMap = await this.getAllocatorRegistryInfoMap();

    return allocators.map((allocator) => {
      const path = registryInfoMap[allocator.addressId]?.json_path;

      return {
        applicationJsonUrl: path ? `${registryRepoUrlBase}/${path}` : null,
        metapathwayType:
          registryInfoMap[allocator.addressId]?.registry_info
            ?.metapathway_type ?? null,
        applicationAudit:
          registryInfoMap[
            allocator.addressId
          ]?.registry_info?.application?.audit?.[0]?.trim() ?? null,
        ...allocator,
      };
    });
  }

  public async getDatacapFlowData(
    returnInactive = true,
    cutoffDate?: Date,
  ): Promise<AllocatorDatacapFlowData[]> {
    const allocators = await this.prismaDmobService.$queryRawTyped(
      getAllocatorDatacapFlowData(returnInactive, cutoffDate),
    );

    const registryInfoMap = await this.getAllocatorRegistryInfoMap();

    return allocators.map((allocator) => {
      return {
        metapathwayType:
          registryInfoMap[allocator.allocatorId]?.registry_info
            ?.metapathway_type ?? null,
        applicationAudit:
          registryInfoMap[
            allocator.allocatorId
          ]?.registry_info?.application?.audit?.[0]?.trim() ?? null,
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
          roundId,
        )
      : await this.getWeekAverageStandardAllocatorRetrievability(
          getLastWeekBeforeTimestamp(editionData.endTimestamp),
          openDataOnly,
          httpRetrievability,
          roundId,
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
                roundId,
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

    const weekProvidersForAllocatorMap: Record<string, string[]> = {};

    // collect unique client ids
    const clientIds = Array.from(
      new Set(weekAllocatorsWithClients.map((x) => x.client)),
    );

    const allocatorIds = Object.keys(clientsByAllocator);

    const [weekProvidersForClients, totalDatacapByAllocators] =
      await Promise.all([
        this.prismaService.client_provider_distribution_weekly_acc.findMany({
          where: { week, client: { in: clientIds } },
          select: { client: true, provider: true },
          distinct: ['client', 'provider'],
        }),
        this.prismaService.allocators_weekly_acc.findMany({
          where: {
            allocator: { in: allocatorIds },
            week,
          },
          select: {
            allocator: true,
            total_sum_of_allocations: true,
          },
        }),
      ]);

    const clientProviders: Record<string, string[]> = {};

    for (const { client, provider } of weekProvidersForClients) {
      if (!clientProviders[client]) {
        clientProviders[client] = [];
      } else {
        clientProviders[client].push(provider);
      }
    }

    Object.entries(clientsByAllocator).forEach(([allocator, clientList]) => {
      weekProvidersForAllocatorMap[allocator] = Array.from(
        new Set(
          clientList.flatMap(({ client }) => clientProviders[client] ?? []),
        ),
      );
    });

    const totalDatacapByAllocatorsMap = totalDatacapByAllocators.reduce(
      (acc, item) => {
        acc[item.allocator] = BigInt(item.total_sum_of_allocations);
        return acc;
      },
      {} as Record<string, bigint>,
    );

    const weekAllocators: AllocatorSpsComplianceWeekSingle[] = allocatorIds.map(
      (allocator) => {
        const weekProvidersForAllocator =
          weekProvidersForAllocatorMap[allocator] || [];

        return {
          id: allocator,
          totalDatacap: totalDatacapByAllocatorsMap[allocator] || BigInt(0),
          ...this.storageProviderService.getProvidersCompliancePercentage(
            weekProvidersCompliance,
            weekProvidersForAllocator,
          ),
          totalSps: weekProvidersForAllocator.length,
        };
      },
    );

    return {
      week: week,
      averageSuccessRate: weekAverageProvidersRetrievability * 100,
      total: weekAllocators.length,
      allocators: weekAllocators,
    };
  }

  public async getStandardAllocatorSpsComplianceWeekly(
    spMetricsToCheck?: StorageProviderComplianceMetrics,
  ): Promise<AllocatorSpsComplianceWeekResponse> {
    const editionData = getFilPlusEditionWithDateTimeRange(
      stringToNumber(spMetricsToCheck?.roundId),
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
  ): Promise<bigint> {
    return (
      await this.prismaService.allocators_weekly_acc.aggregate({
        _sum: {
          total_sum_of_allocations: true,
        },
        where: {
          allocator: allocatorId,
          week: week,
        },
      })
    )._sum.total_sum_of_allocations;
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
    roundId = DEFAULT_FILPLUS_EDITION_ID,
  ): Promise<number> {
    return (
      await this.prismaService.$queryRawTyped(
        getWeekAverageStandardAllocatorRetrievabilityAcc(
          openDataOnly,
          httpRetrievability,
          week,
          roundId,
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

    const extractNumericString = (value: any): string | null => {
      return (value as string)?.replace(/[^0-9]/g, '') || null;
    };

    return {
      application: {
        data_types,
        audit,
        required_sps: extractNumericString(application.required_sps),
        required_replicas: extractNumericString(application.required_replicas),
      },
    };
  }

  public async getAverageSecondsToFirstDeal(
    allocatorId: string,
  ): Promise<number | null> {
    // eslint-disable-next-line no-restricted-syntax
    return Number(
      (
        await this.prismaService.$queryRawTyped(
          getAverageSecondsToFirstDeal(null, allocatorId),
        )
      )?.[0]?.average,
    );
  }
}
