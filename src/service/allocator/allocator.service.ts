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
  AllocatorAuditStatesData,
  AllocatorAuditOutcome,
  AllocatorComplianceScore,
  AllocatorComplianceScoreRange,
  AllocatorDatacapFlowData,
  AllocatorSpsComplianceWeekResults,
  AllocatorSpsComplianceWeek,
  AllocatorSpsComplianceWeekSingle,
  AllocatorAuditTimesData,
  AllocatorAuditOutcomesData,
} from './types.allocator';
import { HistogramHelperService } from '../histogram-helper/histogram-helper.service';
import {
  HistogramWeekFlat,
  HistogramWeek,
  RetrievabilityHistogramWeek,
  RetrievabilityHistogramWeekResults,
  RetrievabilityWeek,
} from '../histogram-helper/types.histogram-helper';
import {
  StorageProviderComplianceMetrics,
  StorageProviderComplianceScore,
} from '../storage-provider/types.storage-provider';
import { PrismaDmobService } from 'src/db/prismaDmob.service';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cacheable } from 'src/utils/cacheable';
import { ConfigService } from '@nestjs/config';
import { arrayAverage, lastWeek, stringToDate } from 'src/utils/utils';

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

  public async getAuditTimesData(): Promise<AllocatorAuditTimesData> {
    const registryInfo = await this.prismaService.allocator_registry.findMany({
      select: {
        registry_info: true,
      },
    });

    const allocatorsAudits = registryInfo.map(
      (allocator) => allocator.registry_info?.['audits'] ?? [],
    );

    const averageAuditTimesSecs: number[] = [];
    const averageAllocationTimesSecs: number[] = [];

    for (let n = 0; ; ++n) {
      const nthAudits = allocatorsAudits
        .map((audits) => audits[n] ?? null)
        .filter(Boolean);

      if (nthAudits.length === 0) break;

      const nthAuditTimeSecs = nthAudits
        .map((audit) => {
          // prettier-ignore
          return (stringToDate(audit.ended)?.getTime() - stringToDate(audit.started)?.getTime()) / 1000;
        })
        .filter(Number.isFinite);

      const nthAllocationTimesSecs = nthAudits
        .map((audit) => {
          // prettier-ignore
          return (stringToDate(audit.dc_allocated)?.getTime() - stringToDate(audit.ended)?.getTime()) / 1000;
        })
        .filter(Number.isFinite);

      averageAuditTimesSecs.push(Math.round(arrayAverage(nthAuditTimeSecs)));
      // prettier-ignore
      averageAllocationTimesSecs.push(Math.round(arrayAverage(nthAllocationTimesSecs)));
    }

    return {
      averageAuditTimesSecs,
      averageAllocationTimesSecs,
    };
  }

  private mapNonFirstAuditOutcome(
    allocatorId: string,
    outcome: string,
  ): AllocatorAuditOutcome | null {
    switch (outcome.toUpperCase()) {
      case 'MATCH':
      case 'MATCHED':
      case 'DOUBLE':
      case 'DOUBLED':
        return AllocatorAuditOutcome.passed;
      case 'THROTTLE':
      case 'THROTTLED':
        return AllocatorAuditOutcome.passedConditionally;
      case 'REJECT':
      case 'REJECTED':
      case 'FAIL':
      case 'FAILED':
        return AllocatorAuditOutcome.failed;
      case 'GRANTED':
        // assuming first audit outcome is always GRANTED and this case is handled elsewhere
        // every other GRANTED outcome is invalid
        this.logger.warn(
          `Allocator ${allocatorId} has non-first audit outcome GRANTED, please investigate`,
        );
        return AllocatorAuditOutcome.invalid;
      default:
        this.logger.warn(
          `Allocator ${allocatorId} has unknown audit outcome ${outcome}, please investigate`,
        );
        return AllocatorAuditOutcome.unknown;
    }
  }

  private mapAuditOutcome(
    allocatorId: string,
    outcome: string,
    auditIndex: number,
  ): AllocatorAuditOutcome | null {
    if (auditIndex === 0) {
      // first audit outcome should always be GRANTED
      if (outcome.toUpperCase() !== 'GRANTED') {
        this.logger.warn(
          `Allocator ${allocatorId} has first audit with outcome ${outcome} !== GRANTED, please investigate`,
        );
      }

      // first datacap is granted without audit
      return AllocatorAuditOutcome.notAudited;
    }

    return this.mapNonFirstAuditOutcome(allocatorId, outcome);
  }

  public async getAuditOutcomesData(): Promise<AllocatorAuditOutcomesData[]> {
    const registryInfo = await this.prismaService.allocator_registry.findMany({
      select: {
        allocator_id: true,
        registry_info: true,
      },
    });

    const allocatorsAuditsFlat = registryInfo
      .flatMap((allocator) =>
        (allocator.registry_info?.['audits'] ?? []).map((audit, i: number) => ({
          outcome: this.mapAuditOutcome(
            allocator.allocator_id,
            audit.outcome,
            i,
          ),
          ended: audit.ended,
          datacapAmount: audit.datacap_amount,
        })),
      )
      .filter((a) => stringToDate(a.ended));

    const allocatorsAuditsByMonth = groupBy(allocatorsAuditsFlat, (audit) => {
      return stringToDate(audit.ended).toISOString().slice(0, 7);
    });

    const auditsByMonthSummary = Object.entries(allocatorsAuditsByMonth).map(
      ([month, auditsInMonth]) => {
        const auditsByOutcome = groupBy(
          auditsInMonth,
          (audit) => audit.outcome,
        );

        const outcomeSums = Object.entries(auditsByOutcome).reduce(
          (acc, [outcome, audits]) => {
            acc[outcome] = audits.reduce(
              (sum, audit) => sum + audit.datacapAmount,
              0,
            );

            return acc;
          },
          {},
        );

        const outcomeCount = Object.fromEntries(
          Object.entries(auditsByOutcome).map(([outcome, audits]) => [
            outcome,
            audits.length,
          ]),
        );

        return {
          month,
          datacap: {
            ...outcomeSums,
          },
          count: {
            ...outcomeCount,
          },
        };
      },
    );

    auditsByMonthSummary.sort((a, b) => {
      return stringToDate(a.month).getTime() - stringToDate(b.month).getTime();
    });

    return auditsByMonthSummary;
  }

  public async getAuditStatesData(): Promise<AllocatorAuditStatesData[]> {
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
          `Allocator ${allocatorId} has first audit with outcome ${audits[0].outcome} !== GRANTED, please investigate`,
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
                outcome: this.mapNonFirstAuditOutcome(
                  allocator.addressId,
                  audit.outcome,
                ),
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

  public async getStandardAllocatorClientsWeekly(): Promise<HistogramWeek> {
    return new HistogramWeek(
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
  ): Promise<RetrievabilityWeek> {
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

    return new RetrievabilityWeek(
      lastWeekAverageRetrievability * 100,
      new RetrievabilityHistogramWeekResults(
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

  public async getStandardAllocatorBiggestClientDistributionWeekly(): Promise<HistogramWeek> {
    return new HistogramWeek(
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
  ): Promise<AllocatorSpsComplianceWeekResults> {
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
  ): Promise<AllocatorSpsComplianceWeek> {
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

    return new AllocatorSpsComplianceWeek(
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
