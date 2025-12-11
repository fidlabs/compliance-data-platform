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
  getAllocatorsIdsByScorePercentageThreshold,
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
  getAllocatorVerifiedClients,
} from 'prismaDmob/generated/client/sql';
import { PrismaService } from 'src/db/prisma.service';
import { PrismaDmobService } from 'src/db/prismaDmob.service';
import { Cacheable } from 'src/utils/cacheable';
import {
  AllocatorAuditOutcome,
  AllocatorAuditOutcomesData,
  AllocatorAuditStatesData,
  AllocatorAuditTimesByMonthData,
  AllocatorAuditTimesByRoundData,
  AllocatorComplianceScore,
  AllocatorComplianceScoreRange,
  AllocatorDatacapFlowData,
  AllocatorSpsComplianceWeek,
  AllocatorSpsComplianceWeekResults,
  AllocatorSpsComplianceWeekSingle,
} from './types.allocator';

import {
  FilPlusEdition,
  getCurrentFilPlusEdition,
  getFilPlusEditionById,
  getFilPlusEditionByTimestamp,
} from 'src/utils/filplus-edition';
import {
  arrayAverage,
  AverageRetrievabilityType,
  lastWeek,
  stringToDate,
  stringToNumber,
} from 'src/utils/utils';
import { HistogramHelperService } from '../histogram-helper/histogram-helper.service';
import {
  HistogramWeek,
  HistogramWeekFlat,
  RetrievabilityHistogramWeek,
  RetrievabilityHistogramWeekResults,
  RetrievabilityWeek,
} from '../histogram-helper/types.histogram-helper';
import { StorageProviderService } from '../storage-provider/storage-provider.service';
import {
  StorageProviderComplianceMetrics,
  StorageProviderComplianceScore,
} from '../storage-provider/types.storage-provider';

import { DateTime } from 'luxon';
import { AllocatorDataType } from 'src/controller/allocators/types.allocators';
import { RetrievabilityType } from 'src/controller/stats/allocators/types.allocator-stats';
import z from 'zod';
import { edition5AllocatorAuditOutcomesData } from './resources/edition5AllocatorAuditOutcomesData';
import { edition5AllocatorAuditStatesData } from './resources/edition5AllocatorAuditStatesData';
import { edition5AllocatorAuditTimesByRoundData } from './resources/edition5AllocatorAuditTimesByRoundData';
import { edition5AllocatorDatacapFlowData } from './resources/edition5AllocatorDatacapFlowData';

const registryEntryWithApproveDateSchema = z.object({
  history: z.object({
    Approved: z.iso.datetime(),
  }),
});

const registryEntriesWithApproveDateMappingSchema = z.preprocess((input) => {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => {
      const result = registryEntryWithApproveDateSchema.safeParse(item);
      return result.success ? result.data : null;
    })
    .filter(
      (item): item is z.infer<typeof registryEntryWithApproveDateSchema> => {
        return item !== null;
      },
    );
}, z.array(registryEntryWithApproveDateSchema));

@Injectable()
export class AllocatorService {
  public static readonly COMPLIANT_ALLOCATORS_DASHBOARD_STAT_SCORE_PERCENTAGE_THRESHOLD = 0.7;
  public static readonly NON_COMPLIANT_ALLOCATORS_DASHBOARD_STAT_SCORE_PERCENTAGE_THRESHOLD = 0.45;

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
  public async getAllocatorRegistryArchiveInfoMap() {
    const registryInfo =
      await this.prismaService.allocator_registry_archive.findMany({
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
    dataType?: AllocatorDataType,
    filPlusEdition?: FilPlusEdition,
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
    const registryArchiveInfoMap =
      await this.getAllocatorRegistryArchiveInfoMap();

    let result = await Promise.all(
      allocators.map(async (allocator) => {
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
          dataType: await this.getAllocatorDataType(
            allocator.addressId,
            registryInfoMap[allocator.addressId]?.registry_info,
          ),
          ...allocator,
        };
      }),
    );

    if (dataType) result = result.filter((item) => item.dataType === dataType);

    if (filPlusEdition) {
      if (filPlusEdition?.id === 6)
        result = result.filter((item) => registryInfoMap[item.addressId]);
      else if (filPlusEdition?.id === 5)
        result = result.filter(
          (item) => registryArchiveInfoMap[item.addressId],
        );
      else
        throw new BadRequestException(
          `Allocators data not available for edition ${filPlusEdition.id}`,
        );
    }

    return result;
  }

  public async isAllocatorOpenData(
    allocatorIdOrAddress: string,
    registryInfo?: any,
  ): Promise<boolean> {
    return (
      (await this.getAllocatorDataType(allocatorIdOrAddress, registryInfo)) ===
      AllocatorDataType.openData
    );
  }

  public async getAllocatorDataType(
    allocatorIdOrAddress: string,
    registryInfo?: any,
  ): Promise<AllocatorDataType | null> {
    registryInfo ??= await this.getAllocatorRegistryInfo(allocatorIdOrAddress);

    const enterpriseApplicationAuditOptions = [
      'Enterprise Data',
      'Automated',
      'Faucet',
      'Market Based',
    ];

    if (!registryInfo) return null;

    return registryInfo?.application?.audit?.some((v) =>
      enterpriseApplicationAuditOptions.includes(v.trim()),
    )
      ? AllocatorDataType.enterprise
      : AllocatorDataType.openData;
  }

  public async getAuditTimesByMonthData(
    filPlusEdition?: FilPlusEdition,
  ): Promise<AllocatorAuditTimesByMonthData[]> {
    const registryInfo = await this.prismaService.allocator_registry.findMany({
      select: {
        registry_info: true,
      },
    });

    let allocatorsAuditsFlat = registryInfo
      .flatMap((allocator) =>
        (allocator.registry_info?.['audits'] ?? []).map((audit) => ({
          ...audit,
        })),
      )
      .filter((a) => stringToDate(a.ended));

    if (filPlusEdition)
      allocatorsAuditsFlat = allocatorsAuditsFlat.filter(
        (audit) =>
          getFilPlusEditionByTimestamp(stringToDate(audit.ended).getTime()) ===
          filPlusEdition,
      );

    const allocatorsAuditsByMonth = groupBy(allocatorsAuditsFlat, (audit) => {
      return stringToDate(audit.ended).toISOString().slice(0, 7);
    });

    return Object.entries(allocatorsAuditsByMonth)
      .map(([month, auditsInMonth]) => {
        const monthAuditTimesSecs = auditsInMonth
          .map((audit) => {
            // prettier-ignore
            return (stringToDate(audit.ended)?.getTime() - stringToDate(audit.started)?.getTime()) / 1000;
          })
          .filter(Number.isFinite);

        const monthAllocationTimesSecs = auditsInMonth
          .map((audit) => {
            // prettier-ignore
            return (stringToDate(audit.dc_allocated)?.getTime() - stringToDate(audit.ended)?.getTime()) / 1000;
          })
          .filter(Number.isFinite);

        return {
          month: month,
          averageAuditTimeSecs: Math.round(arrayAverage(monthAuditTimesSecs)),
          // prettier-ignore
          averageAllocationTimeSecs: Math.round(arrayAverage(monthAllocationTimesSecs),
          ),
        };
      })
      .sort((a, b) => {
        return (
          stringToDate(a.month).getTime() - stringToDate(b.month).getTime()
        );
      });
  }

  public async getAuditTimesByRoundData(
    filPlusEdition: FilPlusEdition,
  ): Promise<AllocatorAuditTimesByRoundData> {
    if (filPlusEdition.id === 5) return edition5AllocatorAuditTimesByRoundData;

    if (filPlusEdition.id !== 6)
      throw new BadRequestException(
        `Audit times by round data not available for edition ${filPlusEdition.id}`,
      );

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
      averageAuditTimesSecs: averageAuditTimesSecs,
      averageAllocationTimesSecs: averageAllocationTimesSecs,
      averageConversationTimesSecs: null, // conversation times are not available for FilPlus edition 6
    };
  }

  public mapAuditOutcome(
    outcome: string,
    allocatorId?: string,
    auditIndex?: number,
  ): AllocatorAuditOutcome {
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
        // assuming first audit outcome is always GRANTED, every other GRANTED outcome is invalid
        if (!auditIndex) return AllocatorAuditOutcome.notAudited;

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

  private async _getAuditOutcomesData(
    filPlusEdition: FilPlusEdition,
  ): Promise<AllocatorAuditOutcomesData[]> {
    if (filPlusEdition.id === 5) return edition5AllocatorAuditOutcomesData;

    if (filPlusEdition.id !== 6)
      throw new BadRequestException(
        `Audit outcomes data not available for edition ${filPlusEdition.id}`,
      );

    const registryInfo = await this.prismaService.allocator_registry.findMany({
      select: {
        allocator_id: true,
        registry_info: true,
      },
    });

    const firstAuditMonth = filPlusEdition.startDate.toISOString().slice(0, 7);

    const currentMonth = new Date().toISOString().slice(0, 7);
    const result: AllocatorAuditOutcomesData[] = [];

    for (
      let auditMonth = firstAuditMonth;
      stringToDate(auditMonth).getTime() <=
      stringToDate(currentMonth).getTime();
      auditMonth = DateTime.fromISO(auditMonth)
        .plus({ month: 1 })
        .toISODate()
        .slice(0, 7)
    ) {
      const allocatorAuditStatesUpMonth = registryInfo.map((allocator) => {
        const allocatorAudits =
          allocator.registry_info?.['audits']?.filter((audit) =>
            stringToDate(audit.ended),
          ) ?? [];

        const allocatorAuditsUpToMonth = allocatorAudits
          .filter((audit) => {
            return stringToDate(audit.ended) <= stringToDate(auditMonth);
          })
          .sort(
            (a, b) =>
              stringToDate(a.ended).getTime() - stringToDate(b.ended).getTime(),
          );

        const lastAllocatorAuditUpToMonth =
          allocatorAuditsUpToMonth[allocatorAuditsUpToMonth.length - 1];

        return lastAllocatorAuditUpToMonth
          ? {
              outcome: this.mapAuditOutcome(
                lastAllocatorAuditUpToMonth.outcome,
                allocator.allocator_id,
                allocatorAuditsUpToMonth.length - 1,
              ),
              datacapAmount:
                typeof lastAllocatorAuditUpToMonth.datacap_amount === 'string'
                  ? stringToNumber(lastAllocatorAuditUpToMonth.datacap_amount)
                  : lastAllocatorAuditUpToMonth.datacap_amount,
            }
          : {
              outcome: AllocatorAuditOutcome.unknown,
              datacapAmount: 0,
            };
      });

      result.push({
        month: auditMonth,
        datacap: allocatorAuditStatesUpMonth.reduce((acc, audit) => {
          acc[audit.outcome] = (acc[audit.outcome] ?? 0) + audit.datacapAmount;
          return acc;
        }, {}),
        count: allocatorAuditStatesUpMonth.reduce((acc, audit) => {
          acc[audit.outcome] = (acc[audit.outcome] ?? 0) + 1;
          return acc;
        }, {}),
      });
    }

    return result;
  }

  public async getAuditOutcomesData(
    filPlusEdition?: FilPlusEdition,
  ): Promise<AllocatorAuditOutcomesData[]> {
    if (filPlusEdition) return await this._getAuditOutcomesData(filPlusEdition);

    // prettier-ignore
    return (
      await this._getAuditOutcomesData(getFilPlusEditionById(5))).concat(
      await this._getAuditOutcomesData(getFilPlusEditionById(6)),
    );
  }

  public async getAuditStatesData(
    filPlusEdition: FilPlusEdition,
  ): Promise<AllocatorAuditStatesData[]> {
    if (filPlusEdition.id === 5) return edition5AllocatorAuditStatesData;

    if (filPlusEdition.id !== 6)
      throw new BadRequestException(
        `Audit states data not available for edition ${filPlusEdition.id}`,
      );

    const allocators = await this.prismaDmobService.$queryRawTyped(
      getAllocatorsFull(false, null, null, null),
    );

    const registryInfoMap = await this.getAllocatorRegistryInfoMap();

    return allocators
      .map((allocator) => {
        const allocatorAudits = registryInfoMap[
          allocator.addressId
        ]?.registry_info?.audits
          .filter((audit) => stringToDate(audit.ended))
          .sort(
            (a, b) =>
              stringToDate(a.ended).getTime() - stringToDate(b.ended).getTime(),
          );

        return {
          allocatorId: allocator.addressId,
          allocatorName: allocator.name,
          audits:
            allocatorAudits
              ?.map((audit, i) => {
                return {
                  ...audit,
                  outcome: this.mapAuditOutcome(
                    audit.outcome,
                    allocator.addressId,
                    i,
                  ),
                };
              })
              ?.slice(1) // skip the first audit, which is always GRANTED
              ?.filter((audit) => audit.outcome) ?? [],
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

    const filPlusEdition = cutoffDate
      ? getFilPlusEditionByTimestamp(cutoffDate.getTime())
      : getCurrentFilPlusEdition();

    if (filPlusEdition.id === 5) {
      const datacapFlowData = edition5AllocatorDatacapFlowData;
      const allocatorsGroupedById = groupBy(allocators, (a) => a.allocatorId);

      return datacapFlowData
        .map((allocator) => {
          return {
            allocatorId: allocator.allocatorId,
            allocatorName:
              allocatorsGroupedById[allocator.allocatorId]?.[0]
                ?.allocatorName ?? null,
            datacap:
              allocatorsGroupedById[allocator.allocatorId]?.[0]?.datacap ??
              null,
            pathway: allocator.pathway,
            typeOfAllocator: allocator.typeOfAllocator,
            metapathwayType: null,
            applicationAudit: null,
          };
        })
        .filter((a) => a.datacap !== null);
    }

    if (filPlusEdition.id === 6) {
      const registryInfo = await this.prismaService.allocator_registry.findMany(
        {
          select: {
            allocator_id: true,
            json_path: true,
            registry_info: true,
          },
        },
      );

      return allocators
        .map((allocator) => {
          const allocatorInfo = registryInfo.find(
            (info) =>
              info.allocator_id === allocator.allocatorId ||
              info.registry_info?.['address'] === allocator.allocatorId,
          );

          return {
            metapathwayType:
              allocatorInfo?.registry_info?.['metapathway_type'] ?? null,
            applicationAudit:
              allocatorInfo?.registry_info?.[
                'application'
              ]?.audit?.[0]?.trim() ?? null,
            ...allocator,
            pathway: null,
            typeOfAllocator: null,
            allocatorId: allocatorInfo?.allocator_id || allocator.allocatorId,
          };
        })
        .filter(
          (allocator) =>
            allocator.metapathwayType && allocator.applicationAudit,
        );
    }

    throw new BadRequestException(
      `Datacap flow data not available for edition ${filPlusEdition.id}`,
    );
  }

  public async getStandardAllocatorClientsWeekly(
    filPlusEditionData?: FilPlusEdition,
  ): Promise<HistogramWeek> {
    return new HistogramWeek(
      await this.getStandardAllocatorCount(false, filPlusEditionData),
      await this.histogramHelper.getWeeklyHistogramResult(
        await this.prismaService.$queryRawTyped(
          getStandardAllocatorClientsWeeklyAcc(
            filPlusEditionData?.startDate,
            filPlusEditionData?.endDate,
          ),
        ),
      ),
    );
  }

  private async _getStandardAllocatorRetrievability(
    openDataOnly = true,
    retrievabilityType: RetrievabilityType,
    filPlusEditionData?: FilPlusEdition,
  ): Promise<HistogramWeekFlat[]> {
    return await this.prismaService.$queryRawTyped(
      getStandardAllocatorRetrievabilityAcc(
        openDataOnly,
        retrievabilityType,
        filPlusEditionData?.startDate,
        filPlusEditionData?.endDate,
        filPlusEditionData?.id,
      ),
    );
  }

  public async getStandardAllocatorRetrievabilityWeekly(
    openDataOnly = true,
    retrievabilityType?: RetrievabilityType,
    filPlusEditionData?: FilPlusEdition,
  ): Promise<RetrievabilityWeek> {
    const isCurrentFilPlusEdition =
      filPlusEditionData?.id === getCurrentFilPlusEdition().id;

    const httpRetrievability = retrievabilityType
      ? retrievabilityType === RetrievabilityType.http
      : undefined;
    const urlFinderRetrievability = retrievabilityType
      ? retrievabilityType === RetrievabilityType.urlFinder
      : undefined;

    const [lastWeekAverageRetrievability, standardAllocatorRetrievability] =
      await Promise.all([
        isCurrentFilPlusEdition
          ? this.getWeekAverageStandardAllocatorRetrievability(
              lastWeek(),
              openDataOnly,
              httpRetrievability,
              urlFinderRetrievability,
              filPlusEditionData?.id,
            )
          : null,
        this._getStandardAllocatorRetrievability(
          openDataOnly,
          retrievabilityType,
          filPlusEditionData,
        ),
      ]);

    const weeklyHistogramResult =
      await this.histogramHelper.getWeeklyHistogramResult(
        standardAllocatorRetrievability,
        100,
      );

    return new RetrievabilityWeek(
      lastWeekAverageRetrievability?.http
        ? lastWeekAverageRetrievability.http * 100
        : null,
      lastWeekAverageRetrievability?.urlFinder
        ? lastWeekAverageRetrievability.urlFinder * 100
        : null,
      new RetrievabilityHistogramWeekResults(
        await this.getStandardAllocatorCount(openDataOnly, filPlusEditionData),
        await Promise.all(
          weeklyHistogramResult.map(async (histogramWeek) => {
            const retrievability =
              await this.getWeekAverageStandardAllocatorRetrievability(
                histogramWeek.week,
                openDataOnly,
                httpRetrievability,
                urlFinderRetrievability,
                filPlusEditionData?.id,
              );

            return RetrievabilityHistogramWeek.of(
              histogramWeek,
              retrievability.http ? retrievability.http * 100 : null,
              retrievability.urlFinder ? retrievability.urlFinder * 100 : null,
            );
          }),
        ),
      ),
    );
  }

  public async getStandardAllocatorBiggestClientDistributionWeekly(
    filPlusEditionData?: FilPlusEdition,
  ): Promise<HistogramWeek> {
    return new HistogramWeek(
      await this.getStandardAllocatorCount(false, filPlusEditionData),
      await this.histogramHelper.getWeeklyHistogramResult(
        await this.prismaService.$queryRawTyped(
          getStandardAllocatorBiggestClientDistributionAcc(
            filPlusEditionData?.startDate,
            filPlusEditionData?.endDate,
            filPlusEditionData?.id,
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
    filPlusEditionId?: number,
  ): Promise<AllocatorSpsComplianceWeekResults> {
    const [
      weekAverageProvidersRetrievability,
      weekProviders,
      weekAllocatorsWithClients,
    ] = await Promise.all([
      this.storageProviderService.getWeekAverageProviderRetrievability(
        week,
        true,
        spMetricsToCheck?.httpRetrievability,
        spMetricsToCheck?.urlFinderRetrievability,
        filPlusEditionId,
      ),
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
          where: { week: week, client: { in: clientIds } },
          select: { client: true, provider: true },
          distinct: ['client', 'provider'],
        }),
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

    const clientProviders: Record<string, string[]> = {};

    for (const { client, provider } of weekProvidersForClients) {
      if (!clientProviders[client]) {
        clientProviders[client] = [];
      }

      clientProviders[client].push(provider);
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
      averageHttpSuccessRate: weekAverageProvidersRetrievability?.http * 100,
      averageUrlFinderSuccessRate:
        weekAverageProvidersRetrievability?.urlFinder * 100,
      total: weekAllocators.length,
      allocators: weekAllocators,
    };
  }

  public async getStandardAllocatorSpsComplianceWeekly(
    spMetricsToCheck?: StorageProviderComplianceMetrics,
    filPlusEditionData?: FilPlusEdition,
  ): Promise<AllocatorSpsComplianceWeek> {
    const isCurrentFilPlusEdition =
      filPlusEditionData?.id === getCurrentFilPlusEdition().id;

    const [weeks, lastWeekAverageProviderRetrievability] = await Promise.all([
      this.storageProviderService.getWeeksTracked(
        filPlusEditionData?.startDate,
        filPlusEditionData?.endDate,
      ),
      isCurrentFilPlusEdition || filPlusEditionData === null
        ? this.storageProviderService.getLastWeekAverageProviderRetrievability(
            true,
            filPlusEditionData?.id,
            spMetricsToCheck?.httpRetrievability,
            spMetricsToCheck?.urlFinderRetrievability,
          )
        : null,
    ]);

    const results = await Promise.all(
      weeks.map((week) =>
        this.getWeekStandardAllocatorSpsCompliance(
          week,
          spMetricsToCheck,
          filPlusEditionData?.id,
        ),
      ),
    );

    return new AllocatorSpsComplianceWeek(
      spMetricsToCheck,
      lastWeekAverageProviderRetrievability?.http * 100,
      lastWeekAverageProviderRetrievability?.urlFinder * 100,
      this.histogramHelper.withoutCurrentWeek(
        this.histogramHelper.sorted(results),
      ),
    );
  }

  // returns the number of standard allocators (not metaallocators)
  public async getStandardAllocatorCount(
    openDataOnly = false,
    filPlusEditionData?: FilPlusEdition,
  ): Promise<number> {
    return (
      await this.prismaService.$queryRawTyped(
        getStandardAllocatorCount(
          openDataOnly,
          filPlusEditionData?.startDate,
          filPlusEditionData?.endDate,
          filPlusEditionData?.id,
        ),
      )
    )[0].count;
  }

  public async getWeekAverageStandardAllocatorRetrievability(
    week: Date,
    openDataOnly = true,
    httpRetrievability = true,
    urlFinderRetrievability = true,
    filPlusEditionId?: number,
  ): Promise<AverageRetrievabilityType> {
    return (
      await this.prismaService.$queryRawTyped(
        getWeekAverageStandardAllocatorRetrievabilityAcc(
          openDataOnly,
          httpRetrievability,
          urlFinderRetrievability,
          week,
          filPlusEditionId,
        ),
      )
    )[0];
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

  @Cacheable({ ttl: 1000 * 60 * 30 }) // 30 minutes
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

  @Cacheable({ ttl: 1000 * 60 * 30 }) // 30 minutes
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

    const dataTypes = (application?.data_types as Prisma.JsonArray)?.map((v) =>
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
        data_types: dataTypes,
        audit: audit,
        required_sps: extractNumericString(application.required_sps),
        required_replicas: extractNumericString(application.required_replicas),
      },
      audits: info?.audits ?? [],
      history: {
        approved: stringToDate(info?.history?.['Approved']),
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

  @Cacheable({ ttl: 1000 * 60 * 30 }) // 30 minutes
  public async getApprovedAllocatorsStat(options?: {
    cutoffDate?: Date;
  }): Promise<number> {
    const { cutoffDate = DateTime.now().toUTC().toJSDate() } = options ?? {};
    const rawRegistryResults =
      await this.prismaService.allocator_registry.findMany({
        select: {
          registry_info: true,
        },
        where: {
          registry_info: {
            path: ['history', 'Approved'],
            not: '',
          },
        },
      });

    const rawRegistryInfo = rawRegistryResults.map(
      (item) => item.registry_info,
    );

    const approvedAllocators =
      registryEntriesWithApproveDateMappingSchema.parse(rawRegistryInfo);

    // Filter in memory because, there should not be that much allocators and
    // filtering JSON field by date in Prisma is either PITA or impossible
    return approvedAllocators.filter((allocator) => {
      return (
        new Date(allocator.history.Approved).valueOf() < cutoffDate.valueOf()
      );
    }).length;
  }

  @Cacheable({ ttl: 1000 * 60 * 30 }) // 30 minutes
  public getCompliantAllocatorsStat(options?: {
    cutoffDate?: Date;
  }): Promise<number> {
    const { cutoffDate = DateTime.now().toUTC().toJSDate() } = options ?? {};

    return this.getAllocatorsPercentageByScoreRange({
      minScorePercentage:
        AllocatorService.COMPLIANT_ALLOCATORS_DASHBOARD_STAT_SCORE_PERCENTAGE_THRESHOLD,
      maxScorePercentage: 1,
      cutoffDate: cutoffDate,
    });
  }

  @Cacheable({ ttl: 1000 * 60 * 30 }) // 30 minutes
  public getNonCompliantAllocatorsStat(options?: {
    cutoffDate?: Date;
  }): Promise<number> {
    const { cutoffDate = DateTime.now().toUTC().toJSDate() } = options ?? {};

    return this.getAllocatorsPercentageByScoreRange({
      minScorePercentage: 0,
      maxScorePercentage:
        AllocatorService.NON_COMPLIANT_ALLOCATORS_DASHBOARD_STAT_SCORE_PERCENTAGE_THRESHOLD,
      cutoffDate: cutoffDate,
    });
  }

  // returns number of Allocators that are considered active based on if they
  // spent DC in last 60 days
  public async getActiveAllocatorsStat(options?: {
    cutoffDate?: Date;
  }): Promise<number> {
    const { cutoffDate = DateTime.now().toJSDate() } = options ?? {};
    const sixtyDaysBefore = DateTime.fromJSDate(cutoffDate).minus({ days: 60 });

    const activeAllocators =
      await this.prismaService.client_datacap_allocation.groupBy({
        by: 'allocator_id',
        where: {
          timestamp: {
            gte: sixtyDaysBefore.toJSDate(),
          },
        },
      });

    return activeAllocators.length;
  }

  private async getAllocatorsPercentageByScoreRange(options: {
    minScorePercentage: number;
    maxScorePercentage: number;
    cutoffDate: Date;
  }): Promise<number> {
    const { minScorePercentage, maxScorePercentage, cutoffDate } = options;

    const [allAllocators, currentlyMatchingAllocators] = await Promise.all([
      // Use the same query to get total count of allocators so the percentage
      // calculation make sense. This makes sure we include only allocators that
      // were scored in a first report generated before the cutoff date
      this.prismaService.$queryRawTyped(
        getAllocatorsIdsByScorePercentageThreshold(0, 1, cutoffDate),
      ),
      this.prismaService.$queryRawTyped(
        getAllocatorsIdsByScorePercentageThreshold(
          minScorePercentage,
          maxScorePercentage,
          cutoffDate,
        ),
      ),
    ]);

    const totalAllocatorsCount = allAllocators.length;

    if (totalAllocatorsCount === 0) {
      return 0;
    }

    const matchingAllocatorsCount = currentlyMatchingAllocators.length;

    return matchingAllocatorsCount / totalAllocatorsCount;
  }

  public async getVerifiedClientsByAllocator(allocatorId: string) {
    const twoWeeksAgoTimestamp =
      Math.floor(Date.now() / 1000) - 14 * 24 * 60 * 60;

    const allocatorData = await this.getAllocatorData(allocatorId);

    if (!allocatorData) return null;

    let allocatorVerifiedClients = [];

    // get all clients of the allocators belonging to the metaallocator
    if (allocatorData.isMetaAllocator) {
      const metaallocatorDetails = await this.prismaDmobService.$queryRawTyped(
        getAllocatorsFull(false, true, allocatorData.addressId, null),
      );

      if (!metaallocatorDetails.length) {
        this.logger.error(
          `Metaallocator details not found for ${allocatorData.addressId}, please investigate`,
        );

        return null;
      }

      const metaallocatorAllocators = Object.values(
        metaallocatorDetails[0].allocatorsUsingMetaallocator,
      ).map((allocator) => allocator.addressId);

      allocatorVerifiedClients = await this.prismaDmobService.$queryRawTyped(
        getAllocatorVerifiedClients(metaallocatorAllocators),
      );
    } else {
      allocatorVerifiedClients = await this.prismaDmobService.$queryRawTyped(
        getAllocatorVerifiedClients([allocatorId]),
      );
    }

    const twoWeeksAgoDate = new Date(twoWeeksAgoTimestamp * 1000);

    const dealSumsRaw =
      await this.prismaService.unified_verified_deal_hourly.findMany({
        where: {
          client: {
            in: allocatorVerifiedClients.map((v) => v.addressId),
          },
          hour: {
            gte: twoWeeksAgoDate,
          },
        },
      });

    const groupByClient = groupBy(dealSumsRaw, (d) => d.client);

    return allocatorVerifiedClients.map((client) => {
      const clientDeals = groupByClient[client.addressId] ?? [];

      const totalDealSize = clientDeals.reduce(
        (acc, v) => acc + (v.total_deal_size ?? BigInt(0)),
        BigInt(0),
      );

      return {
        ...client,
        usedDatacapChange: totalDealSize,
      };
    });
  }
}
