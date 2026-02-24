import { CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { groupBy } from 'lodash';
import { StorageProviderUrlFinderMetricType } from 'prisma/generated/client';
import {
  getAvailableInconsistentAndConsistantRetrievability,
  getUrlFinderProviderMetricWeeklyAcc,
} from 'prisma/generated/client/sql';
import { DataType } from 'src/controller/allocators/types.allocators';
import { FilPlusEditionControllerBase } from 'src/controller/base/filplus-edition-controller-base';
import { FilPlusEditionRequest } from 'src/controller/base/types.filplus-edition-controller-base';
import { StorageProviderComplianceMetricsRequest } from 'src/controller/storage-providers/types.storage-providers';
import { PrismaService } from 'src/db/prisma.service';
import {
  HistogramBase,
  HistogramBaseResults,
  HistogramTotalDatacap,
  HistogramWeek,
  HistogramWeekResults,
  RetrievabilityWeek,
} from 'src/service/histogram-helper/types.histogram-helper';
import { IpniMisreportingCheckerService } from 'src/service/ipni-misreporting-checker/ipni-misreporting-checker.service';
import {
  AggregatedProvidersIPNIReportingStatus,
  AggregatedProvidersIPNIReportingStatusWeekly,
} from 'src/service/ipni-misreporting-checker/types.ipni-misreporting-checker';
import { StorageProviderUrlFinderService } from 'src/service/storage-provider-url-finder/storage-provider-url-finder.service';
import { StorageProviderMetricHistogramDailyResponse } from 'src/service/storage-provider-url-finder/types.storage-provider-url-finder.service';
import { StorageProviderService } from 'src/service/storage-provider/storage-provider.service';
import {
  StorageProviderComplianceMetrics,
  StorageProviderComplianceWeek,
} from 'src/service/storage-provider/types.storage-provider';
import { bigIntToNumber, stringToBool, stringToDate } from 'src/utils/utils';
import { GetRetrievabilityWeeklyRequest } from '../allocators/types.allocator-stats';
import {
  UrlFinderStorageProviderMetricBaseRequest,
  UrlFinderStorageProviderMetricTypeRequest,
} from './types.storage-providers-stats';

@Controller('stats/acc/providers')
@CacheTTL(1000 * 60 * 30) // 30 minutes
export class StorageProvidersAccStatsController extends FilPlusEditionControllerBase {
  constructor(
    private readonly storageProviderService: StorageProviderService,
    private readonly storageProviderUrlFinderService: StorageProviderUrlFinderService,
    private readonly ipniMisreportingCheckerService: IpniMisreportingCheckerService,
    private readonly prismaService: PrismaService,
  ) {
    super();
  }

  @Get('clients')
  @ApiOkResponse({ type: HistogramWeek })
  public async getProviderClientsWeekly(
    @Query() query: FilPlusEditionRequest,
  ): Promise<HistogramWeek> {
    return await this.storageProviderService.getProviderClientsWeekly(
      this.getFilPlusEditionFromRequest(query),
    );
  }

  @Get('biggest-client-distribution')
  @ApiOkResponse({ type: HistogramWeek })
  public async getProviderBiggestClientDistributionWeekly(
    @Query() query: FilPlusEditionRequest,
  ): Promise<HistogramWeek> {
    return await this.storageProviderService.getProviderBiggestClientDistributionWeekly(
      this.getFilPlusEditionFromRequest(query),
    );
  }

  @Get('retrievability')
  @ApiOkResponse({ type: RetrievabilityWeek })
  public async getProviderRetrievabilityWeekly(
    @Query() query: GetRetrievabilityWeeklyRequest,
  ): Promise<RetrievabilityWeek> {
    return await this.storageProviderService.getProviderRetrievabilityWeekly(
      this.getFilPlusEditionFromRequest(query),
      stringToBool(query?.openDataOnly) ? DataType.openData : null,
    );
  }

  @Get('compliance-data')
  @ApiOkResponse({ type: StorageProviderComplianceWeek })
  public async getProviderComplianceWeekly(
    @Query() spMetricsToCheck: StorageProviderComplianceMetricsRequest,
  ): Promise<StorageProviderComplianceWeek> {
    return await this.storageProviderService.getProviderComplianceWeekly(
      StorageProviderComplianceMetrics.of(spMetricsToCheck),
      this.getFilPlusEditionFromRequest(spMetricsToCheck),
    );
  }

  @Get('/aggregated-ipni-status')
  @CacheTTL(1000 * 60 * 60) // 1 hour
  @ApiOperation({
    summary: 'Get aggregated storage providers IPNI reporting status',
  })
  @ApiOkResponse({
    description: 'Aggregated storage providers IPNI reporting status',
    type: AggregatedProvidersIPNIReportingStatus,
  })
  public async getAggregatedProvidersIPNIReportingStatus(): Promise<AggregatedProvidersIPNIReportingStatus> {
    return await this.ipniMisreportingCheckerService.getAggregatedProvidersReportingStatus();
  }

  @Get('/aggregated-ipni-status-weekly')
  @CacheTTL(1000 * 60 * 60) // 1 hour
  @ApiOperation({
    summary: 'Get aggregated storage providers IPNI reporting status over time',
  })
  @ApiOkResponse({
    description: 'Aggregated storage providers IPNI reporting status over time',
    type: AggregatedProvidersIPNIReportingStatusWeekly,
  })
  public async getAggregatedProvidersIPNIReportingStatusWeekly(
    @Query() query: FilPlusEditionRequest,
  ): Promise<AggregatedProvidersIPNIReportingStatusWeekly> {
    return await this.ipniMisreportingCheckerService.getAggregatedProvidersReportingStatusWeekly(
      this.getFilPlusEditionFromRequest(query),
    );
  }

  @Get('/rpa/metrics/retrieval-result-codes')
  @ApiOperation({
    summary:
      'Get SP Url Finder retrieval result codes metrics for storage providers',
  })
  public async getStorageProvidersUrlFinderRetrievalCodesData(
    @Query() query: UrlFinderStorageProviderMetricBaseRequest,
  ): Promise<StorageProviderMetricHistogramDailyResponse> {
    const metrics =
      await this.storageProviderUrlFinderService.getUrlFinderSnapshotsForProviders(
        query?.startDate ? stringToDate(query?.startDate) : undefined,
        query?.endDate ? stringToDate(query?.endDate) : undefined,
      );

    const result =
      await this.storageProviderUrlFinderService.generateRetrievalResultCodesDailyHistogram(
        metrics,
      );

    return result;
  }

  @Get('/rpa/metric')
  @ApiOperation({
    summary: 'Get RPA metrics for storage providers',
  })
  public async getStorageProvidersUrlFinderStandardMetricData(
    @Query() query: UrlFinderStorageProviderMetricTypeRequest,
  ): Promise<HistogramWeek> {
    const startDate = query?.startDate
      ? stringToDate(query?.startDate)
      : undefined;

    const endDate = query?.endDate ? stringToDate(query?.endDate) : undefined;
    let bucketSize = 2000;

    switch (query.metricType) {
      case StorageProviderUrlFinderMetricType.RPA_RETRIEVABILITY:
        bucketSize = 0.05;
        break;
      case StorageProviderUrlFinderMetricType.TTFB:
        bucketSize = 2000;
        break;
      case StorageProviderUrlFinderMetricType.BANDWIDTH:
        bucketSize = 10;
        break;
    }

    const metricWeekData = await this.prismaService.$queryRawTyped(
      getUrlFinderProviderMetricWeeklyAcc(
        query.metricType,
        bucketSize,
        startDate,
        endDate,
      ),
    );

    const rowsByWeek = groupBy(metricWeekData, (r) => r.week.toISOString());

    const weekResults: HistogramWeekResults[] = Object.entries(rowsByWeek).map(
      ([weekIso, weekRows]) => {
        const histograms = weekRows.map(
          (r) =>
            new HistogramTotalDatacap(
              r.valueFromExclusive,
              r.valueToInclusive,
              bigIntToNumber(r.count),
              r.totalDatacap,
            ),
        );

        const total = weekRows.reduce(
          (sum, r) => sum + bigIntToNumber(r.count),
          0,
        );

        return new HistogramWeekResults(new Date(weekIso), total, histograms);
      },
    );

    const totalAcrossAllWeeks = weekResults.reduce(
      (sum, w) => sum + w.total,
      0,
    );

    return new HistogramWeek(totalAcrossAllWeeks, weekResults);
  }

  @Get('/rpa/calculated-metric')
  @ApiOperation({
    summary: 'Get RPA metrics for storage providers',
  })
  public async getStorageProvidersCalculatedMetric(
    @Query() query: UrlFinderStorageProviderMetricBaseRequest,
  ): Promise<{
    AIR: {
      metadata: {
        name: string;
        description: string;
      };
      dailyMetrics: HistogramBaseResults[];
    };
    ACR: {
      metadata: {
        name: string;
        description: string;
      };
      dailyMetrics: HistogramBaseResults[];
    };
  }> {
    const startDate = query?.startDate
      ? stringToDate(query?.startDate)
      : undefined;

    const endDate = query?.endDate ? stringToDate(query?.endDate) : undefined;

    const metricValues = await this.prismaService.$queryRawTyped(
      getAvailableInconsistentAndConsistantRetrievability(startDate, endDate),
    );

    const groupedByMetrics = groupBy(metricValues, (r) => r.metric);

    const airMetric = groupedByMetrics['AIR'];
    const acrMetric = groupedByMetrics['ACR'];

    const airByDay = groupBy(airMetric, (r) => r.day.toISOString());
    const acrByDay = groupBy(acrMetric, (r) => r.day.toISOString());

    const airHistogramByDay = Object.entries(airByDay).map(([day, dayRows]) => {
      const total = dayRows.reduce(
        (sum, r) => sum + bigIntToNumber(r.providers_count),
        0,
      );

      const histograms = dayRows.map(
        (r) =>
          new HistogramBase(
            r.valueFromExclusive.toNumber(),
            r.valueToInclusive.toNumber(),
            bigIntToNumber(r.providers_count),
            Math.round((bigIntToNumber(r.providers_count) / total) * 10000) /
              10000,
          ),
      );

      return new HistogramBaseResults(new Date(day), total, histograms);
    });

    const acrHistogramByDay = Object.entries(acrByDay).map(([day, dayRows]) => {
      const total = dayRows.reduce(
        (sum, r) => sum + bigIntToNumber(r.providers_count),
        0,
      );
      const histograms = dayRows.map(
        (r) =>
          new HistogramBase(
            r.valueFromExclusive.toNumber(),
            r.valueToInclusive.toNumber(),
            bigIntToNumber(r.providers_count),
            Math.round((bigIntToNumber(r.providers_count) / total) * 10000) /
              10000,
          ),
      );

      return new HistogramBaseResults(new Date(day), total, histograms);
    });

    return {
      ACR: {
        metadata: {
          name: 'Available Consistent Retrievability',
          description:
            'Percentage of retrevability of storage providers including only the CAR files',
        },
        dailyMetrics: acrHistogramByDay,
      },
      AIR: {
        metadata: {
          name: 'Available Inconsistent Retrievability',
          description:
            'Percentage of retrevability of storage providers excluding the CAR files (other available files that are not CAR files)',
        },
        dailyMetrics: airHistogramByDay,
      },
    };
  }
}
