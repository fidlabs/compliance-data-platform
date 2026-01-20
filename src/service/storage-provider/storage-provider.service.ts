import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DateTime, DurationLike, Interval } from 'luxon';
import {
  getProviderBiggestClientDistributionAcc,
  getProviderClientsWeeklyAcc,
  getProviderCount,
  getProviderRetrievabilityAcc,
  getProvidersWithIpInfo,
  getWeekAverageProviderRetrievabilityAcc,
} from 'prisma/generated/client/sql';
import { DataType } from 'src/controller/allocators/types.allocators';
import { PrismaService } from 'src/db/prisma.service';
import { Cacheable } from 'src/utils/cacheable';
import {
  FilPlusEdition,
  getCurrentFilPlusEdition,
} from 'src/utils/filplus-edition';
import {
  AverageRetrievabilityType,
  dateToFilecoinBlockHeight,
  lastWeek,
} from 'src/utils/utils';
import { HistogramHelperService } from '../histogram-helper/histogram-helper.service';
import {
  HistogramWeek,
  HistogramWeekFlat,
  RetrievabilityHistogramWeek,
  RetrievabilityHistogramWeekResults,
  RetrievabilityWeek,
} from '../histogram-helper/types.histogram-helper';
import {
  StorageProviderComplianceMetrics,
  StorageProviderComplianceScore,
  StorageProviderComplianceScoreRange,
  StorageProviderComplianceWeek,
  StorageProviderComplianceWeekCount,
  StorageProviderComplianceWeekPercentage,
  StorageProviderComplianceWeekResults,
  StorageProviderComplianceWeekTotalDatacap,
  StorageProviderWeekly,
  StorageProviderWithIpInfo,
} from './types.storage-provider';

@Injectable()
export class StorageProviderService {
  private readonly logger = new Logger(StorageProviderService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly histogramHelper: HistogramHelperService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  public async getProviders() {
    return this.prismaService.provider.findMany({});
  }

  public async getProvidersWithIpInfo(): Promise<StorageProviderWithIpInfo[]> {
    return await this.prismaService.$queryRawTyped(getProvidersWithIpInfo());
  }

  public async getProviderClientsWeekly(
    filPlusEditionData?: FilPlusEdition,
  ): Promise<HistogramWeek> {
    return new HistogramWeek(
      await this.getProviderCount(
        filPlusEditionData?.startDate,
        filPlusEditionData?.endDate,
      ),
      await this.histogramHelper.getWeeklyHistogramResult(
        await this.prismaService.$queryRawTyped(
          getProviderClientsWeeklyAcc(
            filPlusEditionData?.startDate,
            filPlusEditionData?.endDate,
          ),
        ),
      ),
    );
  }

  public async getProviderBiggestClientDistributionWeekly(
    filPlusEditionData?: FilPlusEdition,
  ): Promise<HistogramWeek> {
    return new HistogramWeek(
      await this.getProviderCount(
        filPlusEditionData?.startDate,
        filPlusEditionData?.endDate,
      ),
      await this.histogramHelper.getWeeklyHistogramResult(
        await this.prismaService.$queryRawTyped(
          getProviderBiggestClientDistributionAcc(
            filPlusEditionData?.startDate,
            filPlusEditionData?.endDate,
          ),
        ),
        100,
      ),
    );
  }

  public async getProviderCount(
    startWeekDate?: Date,
    endWeekDate?: Date,
    dataType?: DataType,
  ): Promise<number> {
    return (
      await this.prismaService.$queryRawTyped(
        getProviderCount(dataType, startWeekDate, endWeekDate),
      )
    )[0].count;
  }

  private async _getProviderRetrievability(
    startWeekDate?: Date,
    endWeekDate?: Date,
    dataType?: DataType,
  ): Promise<HistogramWeekFlat[]> {
    return await this.prismaService.$queryRawTyped(
      getProviderRetrievabilityAcc(dataType, startWeekDate, endWeekDate),
    );
  }

  public async getProviderRetrievabilityWeekly(
    filPlusEditionData: FilPlusEdition | null,
    dataType?: DataType,
  ): Promise<RetrievabilityWeek> {
    const isCurrentFilPlusEdition =
      filPlusEditionData?.id === getCurrentFilPlusEdition().id;

    const lastWeekAverageRetrievability =
      isCurrentFilPlusEdition || !filPlusEditionData
        ? await this.getLastWeekAverageProviderRetrievability(
            filPlusEditionData?.id,
            dataType,
          )
        : null;

    const result = await this._getProviderRetrievability(
      filPlusEditionData?.startDate,
      filPlusEditionData?.endDate,
      dataType,
    );

    const weeklyHistogramResult =
      await this.histogramHelper.getWeeklyHistogramResult(result, 100);

    return new RetrievabilityWeek(
      lastWeekAverageRetrievability?.http
        ? lastWeekAverageRetrievability.http * 100
        : null,
      lastWeekAverageRetrievability?.urlFinder
        ? lastWeekAverageRetrievability.urlFinder * 100
        : null,
      new RetrievabilityHistogramWeekResults(
        await this.getProviderCount(
          filPlusEditionData?.startDate,
          filPlusEditionData?.endDate,
          dataType,
        ),
        await Promise.all(
          weeklyHistogramResult.map(async (histogramWeek) => {
            const retrievability =
              await this.getWeekAverageProviderRetrievability(
                histogramWeek.week,
                filPlusEditionData?.id,
                dataType,
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

  public getLastWeekAverageProviderRetrievability(
    filPlusEditionId?: number,
    dataType?: DataType,
  ): Promise<AverageRetrievabilityType> {
    return this.getWeekAverageProviderRetrievability(
      lastWeek(),
      filPlusEditionId,
      dataType,
    );
  }

  public async getProviderComplianceWeekly(
    metricsToCheck?: StorageProviderComplianceMetrics,
    filPlusEditionData?: FilPlusEdition,
  ): Promise<StorageProviderComplianceWeek> {
    const isCurrentFilPlusEdition =
      filPlusEditionData?.id === getCurrentFilPlusEdition().id;

    const [weeks, lastWeekAverageRetrievability] = await Promise.all([
      this.getWeeksTracked(
        filPlusEditionData?.startDate,
        filPlusEditionData?.endDate,
      ),
      isCurrentFilPlusEdition || !filPlusEditionData
        ? this.getLastWeekAverageProviderRetrievability(
            filPlusEditionData?.id,
            DataType.openData,
          )
        : null,
    ]);

    const result: StorageProviderComplianceWeekResults[] = await Promise.all(
      weeks.map(async (week) => {
        const weekAverageRetrievability =
          await this.getWeekAverageProviderRetrievability(
            week,
            filPlusEditionData?.id,
            DataType.openData,
          );

        const weekProviders = await this.getWeekProviders(week);

        const weekProvidersCompliance = weekProviders.map((provider) =>
          this.calculateProviderComplianceScore(
            provider,
            weekAverageRetrievability,
            metricsToCheck,
          ),
        );

        const weekProvidersIds = weekProviders.map(
          (provider) => provider.provider,
        );

        return {
          week: week,
          averageHttpSuccessRate: weekAverageRetrievability.http
            ? weekAverageRetrievability.http * 100
            : null,
          averageUrlFinderSuccessRate: weekAverageRetrievability.urlFinder
            ? weekAverageRetrievability.urlFinder * 100
            : null,
          totalSps: weekProviders.length,
          ...this.getProviderComplianceWeekCountAndDatacap(
            weekProvidersCompliance,
            weekProvidersIds,
            await this.getWeekProvidersTotalDatacap(week),
          ),
        };
      }),
    );

    return new StorageProviderComplianceWeek(
      metricsToCheck,
      lastWeekAverageRetrievability?.http * 100,
      lastWeekAverageRetrievability?.urlFinder * 100,
      this.histogramHelper.withoutCurrentWeek(
        this.histogramHelper.sorted(result),
      ),
    );
  }

  public async getWeekProvidersTotalDatacap(
    week: Date,
  ): Promise<{ total_deal_size: bigint; provider: string }[]> {
    return this.prismaService.providers_weekly_acc.findMany({
      where: {
        week: week,
      },
      select: {
        provider: true,
        total_deal_size: true,
      },
    });
  }

  @Cacheable({ ttl: 1000 * 60 * 30 }) // 30 minutes
  public async getWeekProviders(week: Date): Promise<StorageProviderWeekly[]> {
    return this.prismaService.providers_weekly_acc.findMany({
      where: {
        week: week,
      },
    });
  }

  public async getWeeksTracked(
    startWeekDate?: Date,
    endWeekDate?: Date,
  ): Promise<Date[]> {
    const fromWeekFilter = startWeekDate ? { gte: startWeekDate } : {};
    const toWeekFilter = endWeekDate ? { lte: endWeekDate } : {};

    return (
      await this.prismaService.providers_weekly_acc.findMany({
        distinct: ['week'],
        where: {
          week: {
            ...fromWeekFilter,
            ...toWeekFilter,
          },
        },
        select: {
          week: true,
        },
        orderBy: {
          week: 'asc',
        },
      })
    ).map((p) => p.week);
  }

  // returns 0 - 1
  public async getWeekAverageProviderRetrievability(
    week: Date,
    filPlusEditionId?: number,
    dataType?: DataType,
  ): Promise<AverageRetrievabilityType> {
    return (
      await this.prismaService.$queryRawTyped(
        getWeekAverageProviderRetrievabilityAcc(
          dataType,
          week,
          filPlusEditionId,
        ),
      )
    )[0];
  }

  public calculateProviderComplianceScore(
    providerWeekly: StorageProviderWeekly,
    weekAverageRetrievability: AverageRetrievabilityType,
    metricsToCheck?: StorageProviderComplianceMetrics,
  ): StorageProviderComplianceScore {
    let complianceScore = 0;

    // when rpa retrievability is checked
    if (
      !metricsToCheck?.urlFinderRetrievability ||
      (metricsToCheck?.urlFinderRetrievability &&
        weekAverageRetrievability.urlFinder &&
        providerWeekly.avg_retrievability_success_rate_url_finder >
          weekAverageRetrievability.urlFinder)
    ) {
      complianceScore++;
    }

    if (!metricsToCheck?.numberOfClients || providerWeekly.num_of_clients > 3)
      complianceScore++;

    if (
      !metricsToCheck?.totalDealSize ||
      providerWeekly.biggest_client_total_deal_size * 100n <=
        30n * providerWeekly.total_deal_size
    )
      complianceScore++;

    return {
      provider: providerWeekly.provider,
      complianceScore:
        complianceScore === 4
          ? StorageProviderComplianceScoreRange.Compliant
          : complianceScore === 0
            ? StorageProviderComplianceScoreRange.NonCompliant
            : StorageProviderComplianceScoreRange.PartiallyCompliant,
    };
  }

  public getProviderComplianceWeekCountAndDatacap(
    weekProvidersCompliance: StorageProviderComplianceScore[],
    validProviders: string[],
    weekProvidersTotalDatacap: {
      total_deal_size: bigint | null;
      provider: string;
    }[],
  ): StorageProviderComplianceWeekCount &
    StorageProviderComplianceWeekTotalDatacap {
    //
    const compliantSps = this._getComplianceProviders(
      weekProvidersCompliance,
      validProviders,
      StorageProviderComplianceScoreRange.Compliant,
    );

    const partiallyCompliantSps = this._getComplianceProviders(
      weekProvidersCompliance,
      validProviders,
      StorageProviderComplianceScoreRange.PartiallyCompliant,
    );

    const nonCompliantSps = this._getComplianceProviders(
      weekProvidersCompliance,
      validProviders,
      StorageProviderComplianceScoreRange.NonCompliant,
    );

    return {
      compliantSps: compliantSps.length,
      partiallyCompliantSps: partiallyCompliantSps.length,
      nonCompliantSps: nonCompliantSps.length,
      compliantSpsTotalDatacap: this._getProvidersTotalDatacap(
        compliantSps,
        weekProvidersTotalDatacap,
      ),
      partiallyCompliantSpsTotalDatacap: this._getProvidersTotalDatacap(
        partiallyCompliantSps,
        weekProvidersTotalDatacap,
      ),
      nonCompliantSpsTotalDatacap: this._getProvidersTotalDatacap(
        nonCompliantSps,
        weekProvidersTotalDatacap,
      ),
    };
  }

  public getProvidersCompliancePercentage(
    providersCompliance: StorageProviderComplianceScore[],
    validProviders: string[],
  ): StorageProviderComplianceWeekPercentage {
    return {
      compliantSpsPercentage: this._getProvidersCompliancePercentage(
        providersCompliance,
        validProviders,
        StorageProviderComplianceScoreRange.Compliant,
      ),
      partiallyCompliantSpsPercentage: this._getProvidersCompliancePercentage(
        providersCompliance,
        validProviders,
        StorageProviderComplianceScoreRange.PartiallyCompliant,
      ),
      nonCompliantSpsPercentage: this._getProvidersCompliancePercentage(
        providersCompliance,
        validProviders,
        StorageProviderComplianceScoreRange.NonCompliant,
      ),
    };
  }

  @Cacheable({ ttl: 1000 * 60 * 30 }) // 30 minutes
  public async getStorageProvidersCountStat(options?: {
    cutoffDate?: Date;
  }): Promise<number> {
    const { cutoffDate = DateTime.now().toJSDate() } = options ?? {};
    const cutoffBlockHeight = dateToFilecoinBlockHeight(cutoffDate);

    return await this.prismaService.provider.count({
      where: {
        first_deal_height: {
          lt: cutoffBlockHeight,
        },
      },
    });
  }

  @Cacheable({ ttl: 1000 * 60 * 30 }) // 30 minutes
  public async getActiveStorageProvidersCountStat(options?: {
    cutoffDate?: Date;
  }): Promise<number> {
    const { cutoffDate = DateTime.now().toJSDate() } = options ?? {};
    const sixtyDaysBefore = DateTime.fromJSDate(cutoffDate)
      .minus({ days: 60 })
      .toJSDate();

    const result =
      await this.prismaService.unified_verified_deal_hourly.groupBy({
        by: 'provider',
        _count: {
          provider: true,
        },
        where: {
          hour: {
            gte: sixtyDaysBefore,
            lte: cutoffDate,
          },
        },
      });

    return result[0]?._count.provider ?? 0;
  }

  @Cacheable({ ttl: 1000 * 60 * 30 }) // 30 minutes
  public async getStorageProvidersPercentageByUrlFinderRetrievability(options: {
    cutoffDate?: Date;
    minRetrievability: number;
  }): Promise<number> {
    const { cutoffDate = DateTime.now().toJSDate(), minRetrievability } =
      options;
    const startOfDay = DateTime.fromJSDate(cutoffDate).toUTC().startOf('day');
    const { start: startDate, end: endDate } = Interval.after(startOfDay, {
      day: 1,
    });

    const [matchingCount, totalCount] = await Promise.all([
      this.prismaService.provider_url_finder_retrievability_daily.count({
        where: {
          success_rate: {
            gt: minRetrievability,
          },
          date: {
            gte: startDate.toJSDate(),
            lte: endDate.toJSDate(),
          },
        },
      }),
      this.prismaService.provider_url_finder_retrievability_daily.count({
        where: {
          date: {
            gte: startDate.toJSDate(),
            lte: endDate.toJSDate(),
          },
        },
      }),
    ]);

    return totalCount === 0 ? 0 : matchingCount / totalCount;
  }

  @Cacheable({ ttl: 1000 * 60 * 30 }) // 30 minutes
  public async getStorageProvidersReportingToIPNIPercentage(options?: {
    cutoffDate?: Date;
  }): Promise<number> {
    const { cutoffDate = DateTime.now().toJSDate() } = options ?? {};
    const startOfDay = DateTime.fromJSDate(cutoffDate).toUTC().startOf('day');
    const { start: startDate, end: endDate } = Interval.after(startOfDay, {
      days: 1,
    });

    const result = await this.prismaService.ipni_reporting_daily.findFirst({
      where: {
        date: {
          gte: startDate.toJSDate(),
          lte: endDate.toJSDate(),
        },
      },
      orderBy: {
        date: 'desc',
      },
      select: {
        ok: true,
        total: true,
      },
    });

    if (!result || result.total === 0) {
      return 0;
    }

    return result.ok / result.total;
  }

  @Cacheable({ ttl: 1000 * 60 * 30 }) // 30 minutes
  public async getDDOPercentageStat(options?: {
    cutoffDate?: Date;
    duration?: DurationLike;
  }): Promise<number> {
    const { cutoffDate = DateTime.now().toJSDate(), duration } = options ?? {};
    const interval = duration ? Interval.before(cutoffDate, duration) : null;

    const filter = {
      where: {
        hour: {
          gte: interval ? interval.start.toJSDate() : undefined,
          lte: interval ? interval.end.toJSDate() : cutoffDate,
        },
      },
    };

    // prisma does not allow two different sums in one query
    const [ddoResult, totalResult] = await Promise.all([
      this.prismaService.unified_verified_deal_hourly.aggregate({
        _sum: {
          num_of_ddo_claims: true,
        },
        ...filter,
      }),
      this.prismaService.unified_verified_deal_hourly.aggregate({
        _sum: {
          num_of_claims: true,
        },
        ...filter,
      }),
    ]);

    return totalResult._sum.num_of_claims
      ? ddoResult._sum.num_of_ddo_claims / totalResult._sum.num_of_claims
      : 0;
  }

  @Cacheable({ ttl: 1000 * 60 * 30 }) // 30 minutes
  public async getAverageUrlFinderRetrievabilityStat(options?: {
    cutoffDate?: Date;
  }): Promise<number | null> {
    const { cutoffDate = DateTime.now().toJSDate() } = options ?? {};
    const startOfDay = DateTime.fromJSDate(cutoffDate).toUTC().startOf('day');
    const { start: startDate, end: endDate } = Interval.after(startOfDay, {
      day: 1,
    });

    const result =
      await this.prismaService.provider_url_finder_retrievability_daily.aggregate(
        {
          _avg: {
            success_rate: true,
          },
          where: {
            date: {
              gte: startDate.toJSDate(),
              lte: endDate.toJSDate(),
            },
          },
        },
      );

    return result._avg.success_rate;
  }

  // returns providers with validComplianceScore compliance score
  private _getComplianceProviders(
    providersCompliance: StorageProviderComplianceScore[],
    providers: string[],
    validComplianceScore: StorageProviderComplianceScoreRange,
  ): string[] {
    return (
      providersCompliance
        .filter(
          (p) =>
            providers.includes(p.provider) &&
            p.complianceScore === validComplianceScore,
        )
        .map((p) => p.provider) ?? []
    );
  }

  // returns number of providers with validComplianceScore compliance score
  private _getProviderComplianceCount(
    providersCompliance: StorageProviderComplianceScore[],
    providers: string[],
    validComplianceScore: StorageProviderComplianceScoreRange,
  ): number {
    return this._getComplianceProviders(
      providersCompliance,
      providers,
      validComplianceScore,
    ).length;
  }

  // returns total datacap of providers
  private _getProvidersTotalDatacap(
    providers: string[],
    providersTotalDatacap: {
      total_deal_size: bigint | null;
      provider: string;
    }[],
  ): bigint {
    return (
      providersTotalDatacap
        .filter((p) => providers.includes(p.provider))
        .reduce((acc, p) => acc + p.total_deal_size, 0n) ?? 0n
    );
  }

  // returns percentage 0 - 100 of providers with validComplianceScore compliance score
  private _getProvidersCompliancePercentage(
    providersCompliance: StorageProviderComplianceScore[],
    providers: string[],
    validComplianceScore: StorageProviderComplianceScoreRange,
  ): number {
    return providers.length
      ? (this._getProviderComplianceCount(
          providersCompliance,
          providers,
          validComplianceScore,
        ) /
          providers.length) *
          100
      : 0;
  }
}
