import { Prisma } from 'prisma/generated/client';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import {
  getStandardAllocatorBiggestClientDistributionAcc,
  getStandardAllocatorRetrievabilityAcc,
  getStandardAllocatorClientsWeeklyAcc,
  getStandardAllocatorCount,
  getWeekAverageStandardAllocatorRetrievabilityAcc,
  getAverageSecondsToFirstDeal,
} from 'prisma/generated/client/sql';
import {
  getAllocatorDatacapFlowData,
  getAllocatorsFull,
} from 'prismaDmob/generated/client/sql';
import { groupBy } from 'lodash';
import { StorageProviderService } from '../storage-provider/storage-provider.service';
import {
  AllocatorAuditStateAudits,
  AllocatorAuditStateData,
  AllocatorAuditStateOutcome,
  AllocatorComplianceScore,
  AllocatorComplianceScoreRange,
  AllocatorDatacapFlowData,
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
import { lastWeek, stringToDate } from 'src/utils/utils';

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

  public async getAuditStateData(): Promise<AllocatorAuditStateData[]> {
    const mapAuditOutcome = (
      allocatorId: string,
      outcome: string,
    ): AllocatorAuditStateOutcome | null => {
      switch (outcome.toUpperCase()) {
        case 'MATCHED':
        case 'MATCH':
        case 'DOUBLED':
          return AllocatorAuditStateOutcome.passed;
        case 'THROTTLED':
          return AllocatorAuditStateOutcome.passedConditionally;
        case 'GRANTED':
          // assuming first audit outcome is always GRANTED and this case is handled elsewhere
          // every other GRANTED outcome is invalid
          this.logger.warn(
            `Allocator ${allocatorId} has non-first audit outcome GRANTED, please investigate`,
          );
          return null;
        default:
          this.logger.warn(
            `Allocator ${allocatorId} has unknown audit outcome ${outcome}, please investigate`,
          );
          return null;
      }
    };

    const validateAudits = (
      allocatorId: string,
      audits: any[],
    ): AllocatorAuditStateAudits[] => {
      if (!audits || audits.length === 0) return [];

      audits = audits.sort(
        (a, b) =>
          stringToDate(a.ended).getTime() - stringToDate(b.ended).getTime(),
      );

      if (audits[0].outcome.toUpperCase() !== 'GRANTED') {
        this.logger.warn(
          `Allocator ${allocatorId} has 1st audit with outcome ${audits[1].outcome} !== GRANTED, please investigate`,
        );

        return audits;
      }

      return audits.slice(1);
    };

    const allocators = await this.prismaDmobService.$queryRawTyped(
      getAllocatorsFull(false, null, null, null),
    );

    const registryInfoMap = await this.getAllocatorRegistryInfoMap();

    return allocators
      .map((allocator) => {
        return {
          allocatorId: allocator.addressId,
          allocatorName: allocator.name,
          audits: validateAudits(
            allocator.addressId,
            registryInfoMap[allocator.addressId]?.registry_info?.audits,
          )
            .map((audit) => {
              return {
                ...audit,
                outcome: mapAuditOutcome(allocator.addressId, audit.outcome),
              };
            })
            .filter((audit) => audit.outcome),
        };
      })
      .filter((allocator) => allocator.audits?.length > 0);
  }

  public async getDatacapFlowData(
    cutoffDate?: Date,
  ): Promise<AllocatorDatacapFlowData[]> {
    const allocators = await this.prismaDmobService.$queryRawTyped(
      getAllocatorDatacapFlowData(false, cutoffDate),
    );

    const registryInfoMap = await this.getAllocatorRegistryInfoMap();

    return allocators
      .map((allocator) => {
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
      })
      .filter(
        (allocator) => allocator.metapathwayType && allocator.applicationAudit,
      );
  }

  public async getStandardAllocatorClientsWeekly(): Promise<HistogramWeekResponse> {
    return new HistogramWeekResponse(
      await this.getStandardAllocatorCount(),
      await this.histogramHelper.getWeeklyHistogramResult(
        await this.prismaService.$queryRawTyped(
          getStandardAllocatorClientsWeeklyAcc(),
        ),
      ),
    );
  }

  private async _getStandardAllocatorRetrievability(
    openDataOnly = true,
    httpRetrievability = true,
  ): Promise<HistogramWeekFlat[]> {
    return await this.prismaService.$queryRawTyped(
      getStandardAllocatorRetrievabilityAcc(openDataOnly, httpRetrievability),
    );
  }

  public async getStandardAllocatorRetrievabilityWeekly(
    openDataOnly = true,
    httpRetrievability = true,
  ): Promise<RetrievabilityWeekResponse> {
    const lastWeekAverageRetrievability =
      await this.getWeekAverageStandardAllocatorRetrievability(
        lastWeek(),
        openDataOnly,
        httpRetrievability,
      );

    const result = await this._getStandardAllocatorRetrievability(
      openDataOnly,
      httpRetrievability,
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
                openDataOnly,
                httpRetrievability,
              )) * 100,
            ),
          ),
        ),
      ),
    );
  }

  public async getStandardAllocatorBiggestClientDistributionWeekly(): Promise<HistogramWeekResponse> {
    return new HistogramWeekResponse(
      await this.getStandardAllocatorCount(),
      await this.histogramHelper.getWeeklyHistogramResult(
        await this.prismaService.$queryRawTyped(
          getStandardAllocatorBiggestClientDistributionAcc(),
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
    const weekAverageProvidersRetrievability =
      await this.storageProviderService.getWeekAverageProviderRetrievability(
        week,
      );

    const weekProviders =
      await this.storageProviderService.getWeekProviders(week);

    const weekProvidersCompliance: StorageProviderComplianceScore[] =
      weekProviders.map((provider) => {
        return this.storageProviderService.calculateProviderComplianceScore(
          provider,
          weekAverageProvidersRetrievability,
          spMetricsToCheck,
        );
      });

    const weekAllocatorsWithClients =
      await this.getWeekStandardAllocatorsWithClients(week);

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
                clients.map((p) => p.client),
              );

            return {
              id: allocator,
              totalDatacap: await this.getWeekAllocatorTotalDatacap(
                week,
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
    spMetricsToCheck?: StorageProviderComplianceMetrics,
  ): Promise<AllocatorSpsComplianceWeekResponse> {
    const weeks = await this.storageProviderService.getWeeksTracked();

    const lastWeekAverageProviderRetrievability =
      await this.storageProviderService.getLastWeekAverageProviderRetrievability();

    const results = await Promise.all(
      weeks.map(
        async (week) =>
          await this.getWeekStandardAllocatorSpsCompliance(
            week,
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
