import { Cache, CACHE_MANAGER, CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, Inject, Logger, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { StorageProviderService } from 'src/service/storage-provider/storage-provider.service';
import {
  StorageProviderComplianceMetrics,
  StorageProviderWithIpInfo,
} from 'src/service/storage-provider/types.storage-provider';
import { Cacheable } from 'src/utils/cacheable';
import { bigIntDiv, lastWeek, stringToDate } from 'src/utils/utils';
import { ControllerBase } from '../base/controller-base';
import {
  GetStorageProvidersRequest,
  GetStorageProvidersStatisticsRequest,
  GetWeekStorageProvidersWithSpsComplianceRequest,
  GetWeekStorageProvidersWithSpsComplianceRequestData,
  StorageProvidersDashboardStatistic,
} from './types.storage-providers';
import { DashboardStatisticValue } from '../base/types.controller-base';
import { DateTime } from 'luxon';

const hightUrlFinderRetrievabilityThreshold = 0.7;
const dashboardStatisticsTitleDict: Record<
  StorageProvidersDashboardStatistic['type'],
  StorageProvidersDashboardStatistic['title']
> = {
  TOTAL_STORAGE_PROVIDERS: 'Total SPs',
  TOTAL_ACTIVE_STORAGE_PROVIDERS: 'Active SPs',
  DDO_DEALS_PERCENTAGE: 'DDO Deals',
  DDO_DEALS_PERCENTAGE_TO_DATE: 'DDO Deals to Date',
  STORAGE_PROVIDERS_WITH_HIGH_RPA_PERCENTAGE: 'High RPA SPs',
  STORAGE_PROVIDERS_REPORTING_TO_IPNI_PERCENTAGE: 'SPs Reporting to IPNI',
  AVERAGE_URL_FINDER_RETRIEVABILITY_PERCENTAGE: 'Average RPA',
};

const dashboardStatisticsDescriptionDict: Record<
  StorageProvidersDashboardStatistic['type'],
  StorageProvidersDashboardStatistic['description']
> = {
  TOTAL_STORAGE_PROVIDERS: null,
  TOTAL_ACTIVE_STORAGE_PROVIDERS:
    'Number of Storage Providers who onboarded data in last 60 days',
  DDO_DEALS_PERCENTAGE: 'Percentage of DDO deals in selected duration',
  DDO_DEALS_PERCENTAGE_TO_DATE: 'Percentage of DDO deals up to date',
  STORAGE_PROVIDERS_WITH_HIGH_RPA_PERCENTAGE: `Percentage of Storage Providers with RPA higher than ${hightUrlFinderRetrievabilityThreshold * 100}%`,
  STORAGE_PROVIDERS_REPORTING_TO_IPNI_PERCENTAGE: null,
  AVERAGE_URL_FINDER_RETRIEVABILITY_PERCENTAGE: null,
};

@Controller('storage-providers')
@CacheTTL(1000 * 60 * 30) // 30 minutes
export class StorageProvidersController extends ControllerBase {
  private readonly logger = new Logger(StorageProvidersController.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly storageProviderService: StorageProviderService,
  ) {
    super();
  }

  @Get('/ip-info')
  @ApiOperation({
    summary: 'Get list of storage providers with ip info',
  })
  @ApiOkResponse({
    description: 'List of storage providers with ip info',
    type: StorageProviderWithIpInfo,
    isArray: true,
  })
  public async getStorageProvidersWithIpInfo(): Promise<
    StorageProviderWithIpInfo[]
  > {
    return await this.storageProviderService.getProvidersWithIpInfo();
  }

  @Cacheable({ ttl: 1000 * 60 * 30 }) // 30 minutes
  private async _getStorageProviders() {
    return (await this.storageProviderService.getProviders()).map((p) => ({
      provider: p.id,
      noOfVerifiedDeals: p.num_of_deals,
      verifiedDealsTotalSize: p.total_deal_size,
      noOfClients: p.num_of_clients,
      lastDealHeight: p.last_deal_height,
    }));
  }

  @Get()
  @ApiOperation({
    summary: 'Get list of all storage providers',
  })
  @ApiOkResponse({
    description: 'List of storage providers',
    type: null,
  })
  public async getStorageProviders(@Query() query: GetStorageProvidersRequest) {
    let providers = await this._getStorageProviders();

    if (query.provider) {
      providers = providers.filter(
        (provider) => provider.provider === query.provider,
      );
    }

    return this.withPaginationInfo(
      {
        count: providers.length,
        data: this.paginated(this.sorted(providers, query), query),
      },
      query,
      providers.length,
    );
  }

  @Cacheable({ ttl: 1000 * 60 * 30 }) // 30 minutes
  private async _getWeekStorageProvidersWithSpsCompliance(
    query: GetWeekStorageProvidersWithSpsComplianceRequestData,
  ) {
    const providers = await this._getStorageProviders();

    const weekAverageRetrievability =
      await this.storageProviderService.getWeekAverageProviderRetrievability(
        stringToDate(query.week!)!,
      );

    const weekProviders = await this.storageProviderService.getWeekProviders(
      stringToDate(query.week!)!,
    );

    return weekProviders
      .map((provider) => {
        const providerData = providers.find(
          (p) => p.provider === provider.provider,
        );

        return (
          providerData && {
            complianceScore:
              this.storageProviderService.calculateProviderComplianceScore(
                provider,
                weekAverageRetrievability,
                StorageProviderComplianceMetrics.of(query),
              ).complianceScore,
            ...providerData,
          }
        );
      })
      .filter((provider) => provider?.provider);
  }

  @Get('/compliance-data')
  @ApiOperation({
    summary: 'Get list of storage providers with compliance score',
  })
  @ApiOkResponse({
    description: 'List of storage providers with compliance score',
    type: null,
  })
  public async getWeekStorageProvidersWithSpsCompliance(
    @Query() query: GetWeekStorageProvidersWithSpsComplianceRequest,
  ) {
    query.week ??= lastWeek().toISOString(); // last week default

    let providers = await this._getWeekStorageProvidersWithSpsCompliance(query);

    if (query.complianceScore) {
      providers = providers.filter(
        (storageProvider) =>
          storageProvider.complianceScore === query.complianceScore,
      );
    }

    if (query.provider) {
      providers = providers.filter(
        (provider) => provider.provider === query.provider,
      );
    }

    return this.withPaginationInfo(
      {
        week: query.week,
        metricsChecked: StorageProviderComplianceMetrics.of(query),
        complianceScore: query.complianceScore,
        count: providers.length,
        data: this.paginated(this.sorted(providers, query), query),
      },
      query,
      providers.length,
    );
  }

  @Get('/statistics')
  @ApiOperation({
    summary: 'Get list of statistics regarding storage providers',
  })
  @ApiOkResponse({
    description: 'List of statistics regarding storage providers',
    type: [StorageProvidersDashboardStatistic],
  })
  public async getStorageProvidersStatistics(
    @Query() query: GetStorageProvidersStatisticsRequest,
  ): Promise<StorageProvidersDashboardStatistic[]> {
    const { interval = 'day' } = query;
    const cutoffDate = DateTime.now()
      .toUTC()
      .minus({ [interval]: 1 })
      .toJSDate();

    const [
      currentProvidersCount,
      previousProvidersCount,
      currentActiveProvidersCount,
      previousActiveProvidersCount,
      currentHighRetrievabilityProvidersPercentage,
      previousHighRetrievabilityProvidersPercentage,
      currentProvidersReportingToIPNIPercentage,
      previousProvidersReportingToIPNIPercentage,
      currentDDOPercentage,
      previousDDOPercentage,
      currentDDOPercentageToDate,
      previousDDOPercentageToDate,
      currentAverageUrlFinderRetrievability,
      previousAverageUrlFinderRetrievability,
    ] = await Promise.all([
      this.storageProviderService.getStorageProvidersCountStat(),
      this.storageProviderService.getStorageProvidersCountStat({
        cutoffDate: cutoffDate,
      }),
      this.storageProviderService.getActiveStorageProvidersCountStat(),
      this.storageProviderService.getActiveStorageProvidersCountStat({
        cutoffDate: cutoffDate,
      }),
      this.storageProviderService.getStorageProvidersPercentageByUrlFinderRetrievability(
        { minRetrievability: hightUrlFinderRetrievabilityThreshold },
      ),
      this.storageProviderService.getStorageProvidersPercentageByUrlFinderRetrievability(
        {
          minRetrievability: hightUrlFinderRetrievabilityThreshold,
          cutoffDate: cutoffDate,
        },
      ),
      this.storageProviderService.getStorageProvidersReportingToIPNIPercentage(),
      this.storageProviderService.getStorageProvidersReportingToIPNIPercentage({
        cutoffDate: cutoffDate,
      }),
      this.storageProviderService.getDDOPercentageStat({
        duration: { [interval]: 1 },
      }),
      this.storageProviderService.getDDOPercentageStat({
        duration: { [interval]: 1 },
        cutoffDate: cutoffDate,
      }),
      this.storageProviderService.getDDOPercentageStat(),
      this.storageProviderService.getDDOPercentageStat({
        cutoffDate: cutoffDate,
      }),
      this.storageProviderService.getAverageUrlFinderRetrievabilityStat(),
      this.storageProviderService.getAverageUrlFinderRetrievabilityStat({
        cutoffDate: cutoffDate,
      }),
    ]);

    return [
      this.calculateDashboardStatistic({
        type: 'TOTAL_STORAGE_PROVIDERS',
        interval: interval,
        currentValue: {
          value: currentProvidersCount,
          type: 'numeric',
        },
        previousValue: {
          value: previousProvidersCount,
          type: 'numeric',
        },
      }),
      this.calculateDashboardStatistic({
        type: 'TOTAL_ACTIVE_STORAGE_PROVIDERS',
        interval: interval,
        currentValue: {
          value: currentActiveProvidersCount,
          type: 'numeric',
        },
        previousValue: {
          value: previousActiveProvidersCount,
          type: 'numeric',
        },
      }),
      this.calculateDashboardStatistic({
        type: 'STORAGE_PROVIDERS_WITH_HIGH_RPA_PERCENTAGE',
        interval: interval,
        currentValue: {
          value: currentHighRetrievabilityProvidersPercentage,
          type: 'percentage',
        },
        previousValue: {
          value: previousHighRetrievabilityProvidersPercentage,
          type: 'percentage',
        },
      }),
      this.calculateDashboardStatistic({
        type: 'STORAGE_PROVIDERS_REPORTING_TO_IPNI_PERCENTAGE',
        interval: interval,
        currentValue: {
          value: currentProvidersReportingToIPNIPercentage,
          type: 'percentage',
        },
        previousValue: {
          value: previousProvidersReportingToIPNIPercentage,
          type: 'percentage',
        },
      }),
      this.calculateDashboardStatistic({
        type: 'DDO_DEALS_PERCENTAGE',
        interval: interval,
        currentValue: {
          value: currentDDOPercentage,
          type: 'percentage',
        },
        previousValue: {
          value: previousDDOPercentage,
          type: 'percentage',
        },
      }),
      this.calculateDashboardStatistic({
        type: 'DDO_DEALS_PERCENTAGE_TO_DATE',
        interval: interval,
        currentValue: {
          value: currentDDOPercentageToDate,
          type: 'percentage',
        },
        previousValue: {
          value: previousDDOPercentageToDate,
          type: 'percentage',
        },
      }),
      this.calculateDashboardStatistic({
        type: 'AVERAGE_URL_FINDER_RETRIEVABILITY_PERCENTAGE',
        interval: interval,
        currentValue: {
          value: currentAverageUrlFinderRetrievability ?? 0,
          type: 'percentage',
        },
        previousValue: {
          value: previousAverageUrlFinderRetrievability ?? 0,
          type: 'percentage',
        },
      }),
    ];
  }

  private calculateDashboardStatistic(options: {
    type: StorageProvidersDashboardStatistic['type'];
    currentValue: DashboardStatisticValue;
    previousValue: DashboardStatisticValue;
    interval: StorageProvidersDashboardStatistic['percentageChange']['interval'];
  }): StorageProvidersDashboardStatistic {
    const { type, currentValue, previousValue, interval } = options;

    if (currentValue.type !== previousValue.type) {
      throw new TypeError(
        'Cannot compare different dashboard statistics types',
      );
    }

    const percentageChange: StorageProvidersDashboardStatistic['percentageChange'] =
      (() => {
        if (!previousValue.value) return null;

        const ratio =
          currentValue.type === 'bigint' || previousValue.type === 'bigint'
            ? bigIntDiv(
                BigInt(currentValue.value),
                BigInt(previousValue.value),
                2,
              )
            : currentValue.value / previousValue.value;

        return {
          value: ratio - 1,
          interval: interval,
        };
      })();

    let title = dashboardStatisticsTitleDict[type];

    if (type === 'DDO_DEALS_PERCENTAGE') {
      title = `${title} (${this.statisticIntervalToReadableText(interval)})`;
    }

    return {
      type: type,
      title: title,
      description: dashboardStatisticsDescriptionDict[type],
      value: currentValue,
      percentageChange: percentageChange,
    };
  }

  private statisticIntervalToReadableText(
    interval: StorageProvidersDashboardStatistic['percentageChange']['interval'],
  ): string {
    switch (interval) {
      case 'day':
        return 'Last 24h';
      case 'week':
        return 'Last Week';
      case 'month':
        return 'Last Month';
    }
  }
}
