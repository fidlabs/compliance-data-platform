import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  getProviderBiggestClientDistributionAcc,
  getProviderClientsWeeklyAcc,
  getProviderCount,
  getProviderRetrievabilityAcc,
  getProvidersWithIpInfo,
  getWeekAverageProviderRetrievabilityAcc,
} from 'prisma/generated/client/sql';
import { RetrievabilityType } from 'src/controller/stats/allocators/types.allocator-stats';
import { PrismaService } from 'src/db/prisma.service';
import { Cacheable } from 'src/utils/cacheable';
import {
  FilPlusEdition,
  getCurrentFilPlusEdition,
} from 'src/utils/filplus-edition';
import { AverageRetrievabilityType, lastWeek } from 'src/utils/utils';
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
        false,
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
        false,
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
    openDataOnly = false,
    startWeekDate?: Date,
    endWeekDate?: Date,
  ): Promise<number> {
    return (
      await this.prismaService.$queryRawTyped(
        getProviderCount(openDataOnly, startWeekDate, endWeekDate),
      )
    )[0].count;
  }

  private async _getProviderRetrievability(
    openDataOnly = true,
    retrievabilityType?: RetrievabilityType,
    startWeekDate?: Date,
    endWeekDate?: Date,
  ): Promise<HistogramWeekFlat[]> {
    return await this.prismaService.$queryRawTyped(
      getProviderRetrievabilityAcc(
        openDataOnly,
        retrievabilityType,
        startWeekDate,
        endWeekDate,
      ),
    );
  }

  public async getProviderRetrievabilityWeekly(
    openDataOnly = true,
    filPlusEditionData: FilPlusEdition | null,
    retrievabilityType?: RetrievabilityType,
  ): Promise<RetrievabilityWeek> {
    const isCurrentFilPlusEdition =
      filPlusEditionData?.id === getCurrentFilPlusEdition().id;

    const lastWeekAverageRetrievability =
      isCurrentFilPlusEdition || !filPlusEditionData
        ? await this.getLastWeekAverageProviderRetrievability(
            openDataOnly,
            retrievabilityType,
          )
        : null;

    const result = await this._getProviderRetrievability(
      openDataOnly,
      retrievabilityType,
      filPlusEditionData?.startDate,
      filPlusEditionData?.endDate,
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
          openDataOnly,
          filPlusEditionData?.startDate,
          filPlusEditionData?.endDate,
        ),
        await Promise.all(
          weeklyHistogramResult.map(async (histogramWeek) => {
            const retrievability =
              await this.getWeekAverageProviderRetrievability(
                histogramWeek.week,
                openDataOnly,
                retrievabilityType,
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

  public getLastWeekAverageProviderRetrievability(
    openDataOnly = true,
    retrievabilityType?: RetrievabilityType,
    filPlusEditionId?: number,
  ): Promise<AverageRetrievabilityType> {
    return this.getWeekAverageProviderRetrievability(
      lastWeek(),
      openDataOnly,
      retrievabilityType,
      filPlusEditionId,
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
            true,
            metricsToCheck?.retrievabilityType,
            filPlusEditionData?.id,
          )
        : null,
    ]);

    const result: StorageProviderComplianceWeekResults[] = await Promise.all(
      weeks.map(async (week) => {
        const weekAverageRetrievability =
          await this.getWeekAverageProviderRetrievability(
            week,
            true,
            metricsToCheck?.retrievabilityType,
            filPlusEditionData?.id,
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
  private async _getWeekProvidersForClients(
    week: Date,
    clients: string[] = [],
  ): Promise<{ provider: string; client: string }[]> {
    return await this.prismaService.client_provider_distribution_weekly_acc.findMany(
      {
        where: {
          week: week,
          client: {
            in: clients.length ? clients : undefined,
          },
        },
        select: {
          provider: true,
          client: true,
        },
        distinct: ['provider', 'client'],
      },
    );
  }

  public async getWeekProvidersForClients(
    week: Date,
    clients: string[],
  ): Promise<string[]> {
    const providers = await this._getWeekProvidersForClients(week, clients);

    const result = providers.map((p) => p.provider);

    return [...new Set(result)];
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
    openDataOnly = true,
    retrievabilityType?: RetrievabilityType,
    filPlusEditionId?: number,
  ): Promise<AverageRetrievabilityType> {
    return (
      await this.prismaService.$queryRawTyped(
        getWeekAverageProviderRetrievabilityAcc(
          openDataOnly,
          retrievabilityType,
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

    // when http retrievability is checked
    if (
      metricsToCheck?.retrievabilityType === RetrievabilityType.http &&
      weekAverageRetrievability.http &&
      providerWeekly.avg_retrievability_success_rate_http >
        weekAverageRetrievability.http
    ) {
      complianceScore++;
    }

    // when rpa retrievability is checked
    if (
      metricsToCheck?.retrievabilityType === RetrievabilityType.urlFinder &&
      weekAverageRetrievability.urlFinder &&
      providerWeekly.avg_retrievability_success_rate_url_finder >
        weekAverageRetrievability.urlFinder
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
        complianceScore === 3
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
