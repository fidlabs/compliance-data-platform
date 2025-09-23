import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import {
  AllocatorScoringMetric,
  StorageProviderIpniReportingStatus,
} from 'prisma/generated/client';
import { DateTime } from 'luxon';
import {
  arrayAverage,
  bigIntArrayAverage,
  bigIntDiv,
  bigIntSqrt,
} from 'src/utils/utils';
import { AllocatorService } from '../allocator/allocator.service';
import { filesize } from 'filesize';
import { Cacheable } from 'src/utils/cacheable';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class AllocatorScoringService {
  private readonly logger = new Logger(AllocatorScoringService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly allocatorService: AllocatorService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  public async storeScoring(reportId: string) {
    const report = await this.prismaService.allocator_report.findUnique({
      where: {
        id: reportId,
      },
    });

    const isOpenData = await this.allocatorService.isAllocatorOpenData(
      report.allocator,
    );

    if (isOpenData === null) {
      this.logger.warn(
        `Skipping scoring calculations for round 5 ${report.allocator}`,
      );

      return;
    }

    await this.storeIPNIReportingScore(report, isOpenData);
    await this.storeHttpRetrievabilityScore(report, isOpenData);
    await this.storeUrlFinderRetrievabilityScore(report, isOpenData);
    await this.storeCIDSharingScore(report, isOpenData);
    await this.storeDuplicatedDataScore(report, isOpenData);
    await this.storeUniqueDataSetSizeScore(report, isOpenData);
    await this.storeEqualityOfDatacapDistribution(report, isOpenData);
    await this.storeClientDiversityScore(report, isOpenData);
    await this.storeClientPreviousApplicationsScore(report, isOpenData);
  }

  @Cacheable({ ttl: 1000 * 60 * 30 }) // 30 minutes
  public async getTotalScoreAverage(
    isOpenData: boolean | null,
  ): Promise<number | null> {
    if (isOpenData === null) return null;

    const latestScores = await this.prismaService.$queryRaw<
      { total_score: number; allocator: string }[]
    >`select distinct on ("ar"."allocator") "ar"."allocator",
                                            sum("arsr"."score")::int as "total_score"
      from "allocator_report" "ar"
               join "allocator_report_scoring_result" "arsr"
                    on "ar"."id" = "arsr"."allocator_report_id"
      group by "ar"."allocator", "ar"."create_date"
      order by "ar"."allocator", "ar"."create_date" desc
    `;

    const registryInfoMap =
      await this.allocatorService.getAllocatorRegistryInfoMap();

    const scores = latestScores
      .filter(async (score) => {
        return (
          isOpenData ===
          (await this.allocatorService.isAllocatorOpenData(
            score.allocator,
            registryInfoMap[score.allocator],
          ))
        );
      })
      .map((score) => score.total_score);

    return arrayAverage(scores);
  }

  private calculateNthPercentile(
    sortedArray: number[],
    n: number,
  ): number | null {
    if (n < 0 || n > 100)
      throw new Error('Percentile must be between 0 and 100');

    if (!sortedArray?.length) return null;

    const index = (n / 100) * (sortedArray.length - 1);

    if (Math.floor(index) === index) {
      return sortedArray[index];
    } else {
      const lower = sortedArray[Math.floor(index)];
      const upper = sortedArray[Math.ceil(index)];
      return lower + (upper - lower) * (index - Math.floor(index));
    }
  }

  private calculateStandardDeviation(values: bigint[]): bigint | null {
    if (!values?.length) return null;

    const average = bigIntArrayAverage(values);

    const variance =
      values.reduce((acc, val) => acc + (val - average) ** 2n, 0n) /
      BigInt(values.length);

    return bigIntSqrt(variance);
  }

  private convertFilesize(size?: bigint | number | string): string | null {
    if (size === undefined || size === null) return null;
    return filesize(size, { base: 2 });
  }

  private async getMetricAverage(
    metric: AllocatorScoringMetric,
  ): Promise<number | null> {
    const result = await this.prismaService.$queryRaw<
      { avg: number | null }[]
    >`select avg("metric_value")::int as "avg"
      from (select distinct on ("ar"."allocator") "ar"."allocator",
                                                  "arsr"."metric_value"
            from "allocator_report" "ar"
                     join "allocator_report_scoring_result" "arsr"
                          on "ar"."id" = "arsr"."allocator_report_id"
            where "arsr"."metric"::text = ${metric}
            group by "ar"."allocator", "ar"."create_date", "arsr"."metric_value"
            order by "ar"."allocator", "ar"."create_date" desc) "t";
    `;

    return result[0]?.avg ?? null;
  }

  private async getMetricMax(
    metric: AllocatorScoringMetric,
  ): Promise<number | null> {
    const result = await this.prismaService.$queryRaw<
      { max: number | null }[]
    >`select max("metric_value")::int as "max"
      from (select distinct on ("ar"."allocator") "ar"."allocator",
                                                  "arsr"."metric_value"
            from "allocator_report" "ar"
                     join "allocator_report_scoring_result" "arsr"
                          on "ar"."id" = "arsr"."allocator_report_id"
            where "arsr"."metric"::text = ${metric}
            group by "ar"."allocator", "ar"."create_date", "arsr"."metric_value"
            order by "ar"."allocator", "ar"."create_date" desc) "t";`;

    return result[0]?.max ?? null;
  }

  private async storeScore(
    reportId: string,
    metric: AllocatorScoringMetric,
    metricValue: number,
    metricValueMin: number | null,
    metricValueMax: number | null,
    score: number,
    openDataScoreWeight: number,
    enterpriseScoreWeight: number,
    isOpenData: boolean,
    metricName: string,
    metricDescription: string,
    metricUnit: string | null,
    scoreRanges: {
      metricValueMin: number | null;
      metricValueMax: number | null;
      score: number;
    }[],
    metadata?: object,
  ) {
    const scoreWeight = isOpenData
      ? openDataScoreWeight
      : enterpriseScoreWeight;

    if (!scoreWeight) return;

    metadata = {
      ...metadata,
      'Open data score weight': openDataScoreWeight,
      'Enterprise score weight': enterpriseScoreWeight,
      'Type of allocator': isOpenData ? 'Open data' : 'Enterprise',
    };

    await this.prismaService.allocator_report_scoring_result.create({
      data: {
        allocator_report_id: reportId,
        metric: metric,
        metric_value: metricValue,
        metric_average: await this.getMetricAverage(metric),
        metric_value_min: metricValueMin,
        metric_value_max:
          metricValueMax ??
          Math.max(await this.getMetricMax(metric), metricValue),
        metric_name: metricName,
        metric_description: metricDescription,
        metric_unit: metricUnit,
        score: score * scoreWeight,
        ranges: {
          create: scoreRanges.map((range) => ({
            metric_value_min: range.metricValueMin,
            metric_value_max: range.metricValueMax,
            score: range.score * scoreWeight,
          })),
        },
        metadata: metadata
          ? Object.entries(metadata).map(
              ([key, value]) => `${key}: ${String(value ?? null)}`,
            )
          : null,
      },
    });
  }

  private async storeIPNIReportingScore(report, isOpenData: boolean) {
    const openDataScoreWeight = 3;
    const enterpriseScoreWeight = 0;

    const ipniOKDatacap =
      (
        await this.prismaService.allocator_report_storage_provider_distribution.aggregate(
          {
            _sum: {
              total_deal_size: true,
            },
            where: {
              allocator_report_id: report.id,
              ipni_reporting_status: StorageProviderIpniReportingStatus.OK,
            },
          },
        )
      )._sum.total_deal_size || 0n;

    const totalDatacap =
      (
        await this.prismaService.allocator_report_storage_provider_distribution.aggregate(
          {
            _sum: {
              total_deal_size: true,
            },
            where: {
              allocator_report_id: report.id,
            },
          },
        )
      )._sum.total_deal_size || 0n;

    const percentageOfIPNIOKDatacap = !totalDatacap
      ? 0
      : bigIntDiv(ipniOKDatacap * 100n, totalDatacap);

    let score = 0;
    if (percentageOfIPNIOKDatacap > 99) {
      score = 3;
    } else if (percentageOfIPNIOKDatacap >= 75) {
      score = 1;
    }

    await this.storeScore(
      report.id,
      AllocatorScoringMetric.IPNI_REPORTING,
      percentageOfIPNIOKDatacap,
      0,
      100,
      score,
      openDataScoreWeight,
      enterpriseScoreWeight,
      isOpenData,
      'IPNI reporting',
      'Measures if data is correctly reported and indexed in IPNI',
      '%',
      [
        { metricValueMin: 0, metricValueMax: 75, score: 0 },
        { metricValueMin: 75, metricValueMax: 99, score: 1 },
        { metricValueMin: 99, metricValueMax: 100, score: 3 },
      ],
      {
        'IPNI OK Datacap': this.convertFilesize(ipniOKDatacap),
        'Total Datacap': this.convertFilesize(totalDatacap),
        'Percentage of IPNI OK datacap': percentageOfIPNIOKDatacap.toString(),
        'Percentage of IPNI OK datacap > 99': '3 points',
        'Percentage of IPNI OK datacap >= 75': '1 point',
        'Percentage of IPNI OK datacap < 75': '0 points',
      },
    );
  }

  private async storeHttpRetrievabilityScore(report, isOpenData: boolean) {
    const openDataScoreWeight = 1;
    const enterpriseScoreWeight = 1;

    const reportCreateWeekAgo = DateTime.fromJSDate(report.create_date)
      .startOf('week')
      .minus({ weeks: 1 }) // no data is available for the current week, so we look one week back
      .toJSDate();

    const allAllocatorsRetrievabilities =
      await this.prismaService.allocators_weekly_acc.findMany({
        where: {
          week: reportCreateWeekAgo,
        },
        select: {
          allocator: true,
          avg_weighted_retrievability_success_rate_http: true,
        },
      });

    const allocatorRetrievability =
      (allAllocatorsRetrievabilities.find(
        (a) => a.allocator === report.allocator,
      )?.avg_weighted_retrievability_success_rate_http ?? 0) * 100;

    const sortedRetrievabilities = allAllocatorsRetrievabilities
      .map((a) => a.avg_weighted_retrievability_success_rate_http || 0)
      .sort((a, b) => a - b);

    const _50thPercentile =
      this.calculateNthPercentile(sortedRetrievabilities, 50) * 100;

    const _75thPercentile =
      this.calculateNthPercentile(sortedRetrievabilities, 75) * 100;

    let score = 0;
    if (allocatorRetrievability > _75thPercentile) {
      score = 3;
    } else if (allocatorRetrievability > _50thPercentile) {
      score = 1;
    }

    await this.storeScore(
      report.id,
      AllocatorScoringMetric.HTTP_RETRIEVABILITY,
      allocatorRetrievability,
      0,
      100,
      score,
      openDataScoreWeight,
      enterpriseScoreWeight,
      isOpenData,
      'HTTP retrievability',
      'Measures if data is available to anyone on the network',
      '%',
      // prettier-ignore
      [
        { metricValueMin: 0, metricValueMax: _50thPercentile, score: 0 },
        { metricValueMin: _50thPercentile, metricValueMax: _75thPercentile, score: 1 },
        { metricValueMin: _75thPercentile, metricValueMax: 100, score: 3 },
      ],
      {
        'Allocator retrievability': allocatorRetrievability.toFixed(2),
        '50th percentile of all allocators retrievabilities':
          _50thPercentile?.toFixed(2),
        '75th percentile of all allocators retrievabilities':
          _75thPercentile?.toFixed(2),
        'Allocator retrievability > 75th percentile': '3 points',
        'Allocator retrievability > 50th percentile': '1 point',
        'Allocator retrievability <= 50th percentile': '0 points',
      },
    );
  }

  private async storeUrlFinderRetrievabilityScore(report, isOpenData: boolean) {
    const openDataScoreWeight = 5;
    const enterpriseScoreWeight = 0;

    const reportCreateDayAgo = DateTime.fromJSDate(report.create_date)
      .startOf('day')
      .minus({ day: 1 }) // today's data might be incomplete, so we look one day back
      .toJSDate();

    const allStorageProvidersRetrievabilities =
      await this.prismaService.provider_url_finder_retrievability_daily.findMany(
        {
          where: {
            date: {
              gte: reportCreateDayAgo,
              lt: DateTime.fromJSDate(reportCreateDayAgo)
                .plus({ days: 1 })
                .toJSDate(),
            },
          },
          select: {
            success_rate: true,
          },
        },
      );

    const sortedRetrievabilities = allStorageProvidersRetrievabilities
      .map((a) => a.success_rate || 0)
      .sort((a, b) => a - b);

    const _50thPercentile =
      (this.calculateNthPercentile(sortedRetrievabilities, 50) ?? 0) * 100;

    const _75thPercentile =
      (this.calculateNthPercentile(sortedRetrievabilities, 75) ?? 0) * 100;

    const allocatorRetrievability =
      (report.avg_retrievability_success_rate_url_finder ?? 0) * 100;

    let score = 0;
    if (allocatorRetrievability > _75thPercentile) {
      score = 3;
    } else if (allocatorRetrievability > _50thPercentile) {
      score = 1;
    }

    await this.storeScore(
      report.id,
      AllocatorScoringMetric.URL_FINDER_RETRIEVABILITY,
      allocatorRetrievability,
      0,
      100,
      score,
      openDataScoreWeight,
      enterpriseScoreWeight,
      isOpenData,
      'RPA retrievability',
      'Verifies real retrievability but from known actors',
      '%',
      // prettier-ignore
      [
        { metricValueMin: 0, metricValueMax: _50thPercentile, score: 0 },
        { metricValueMin: _50thPercentile, metricValueMax: _75thPercentile, score: 1 },
        { metricValueMin: _75thPercentile, metricValueMax: 100, score: 3 },
      ],
      {
        'Allocator retrievability': allocatorRetrievability?.toFixed(2),
        '50th Percentile': _50thPercentile?.toFixed(2),
        '75th Percentile': _75thPercentile?.toFixed(2),
        'Allocator retrievability > 75th Percentile': '3 points',
        'Allocator retrievability > 50th Percentile': '1 point',
        'Allocator retrievability <= 50th Percentile': '0 points',
      },
    );
  }

  private async storeCIDSharingScore(report, isOpenData: boolean) {
    const openDataScoreWeight = 3;
    const enterpriseScoreWeight = 3;

    const allocatorClients =
      await this.prismaService.allocator_report_client.findMany({
        where: {
          allocator_report_id: report.id,
        },
        include: {
          cid_sharing: true,
        },
      });

    const allocatorClientsTotalAllocation = allocatorClients.reduce(
      (acc, client) => acc + client.total_allocations,
      0n,
    );

    const allocatorClientsWithCIDSharingAllocations = allocatorClients.reduce(
      (acc, client) =>
        acc +
        (client.cid_sharing
          ? client.cid_sharing.reduce(
              (acc, cidSharing) => acc + cidSharing.total_deal_size,
              0n,
            )
          : 0n),
      0n,
    );

    const percentageOfCIDSharing = !allocatorClientsTotalAllocation
      ? 0
      : bigIntDiv(
          allocatorClientsWithCIDSharingAllocations * 100n,
          allocatorClientsTotalAllocation,
        );

    let score = 0;
    if (percentageOfCIDSharing === 0) {
      score = 2;
    } else if (percentageOfCIDSharing > 0 && percentageOfCIDSharing <= 2) {
      score = 1;
    }

    await this.storeScore(
      report.id,
      AllocatorScoringMetric.CID_SHARING,
      percentageOfCIDSharing,
      0,
      100,
      score,
      openDataScoreWeight,
      enterpriseScoreWeight,
      isOpenData,
      'CID sharing',
      'Measures the same CID shared between different clients',
      '%',
      [
        { metricValueMin: 0, metricValueMax: 0, score: 2 },
        { metricValueMin: 0, metricValueMax: 2, score: 1 },
        { metricValueMin: 2, metricValueMax: 100, score: 0 },
      ],
      {
        'Total allocations': this.convertFilesize(
          allocatorClientsTotalAllocation,
        ),
        'Allocations with CID sharing': this.convertFilesize(
          allocatorClientsWithCIDSharingAllocations,
        ),
        'Percentage of allocations with CID sharing':
          percentageOfCIDSharing.toFixed(2),
        'Percentage of allocations with CID sharing = 0': '2 points',
        'Percentage of allocations with CID sharing > 0 and <= 2': '1 point',
        'Percentage of allocations with CID sharing > 2': '0 points',
      },
    );
  }

  private async storeDuplicatedDataScore(report, isOpenData: boolean) {
    const openDataScoreWeight = 2;
    const enterpriseScoreWeight = 2;

    const providerDistribution =
      await this.prismaService.allocator_report_storage_provider_distribution.findMany(
        {
          where: {
            allocator_report_id: report.id,
          },
        },
      );

    const totalDatacap = providerDistribution.reduce(
      (acc, storageProvider) => acc + storageProvider.total_deal_size,
      0n,
    );

    const duplicatedDatacap = providerDistribution.reduce(
      (acc, storageProvider) =>
        acc +
        (storageProvider.total_deal_size - storageProvider.unique_data_size),
      0n,
    );

    const percentageOfDuplicatedData = !totalDatacap
      ? 0
      : bigIntDiv(duplicatedDatacap * 100n, totalDatacap);

    let score = 0;
    if (percentageOfDuplicatedData === 0) {
      score = 2;
    } else if (percentageOfDuplicatedData <= 10) {
      score = 1;
    }

    await this.storeScore(
      report.id,
      AllocatorScoringMetric.DUPLICATED_DATA,
      percentageOfDuplicatedData,
      0,
      100,
      score,
      openDataScoreWeight,
      enterpriseScoreWeight,
      isOpenData,
      'Duplicated data',
      'Measures if this the same car file that is sealed on the same SP',
      '%',
      [
        { metricValueMin: 0, metricValueMax: 0, score: 2 },
        { metricValueMin: 0, metricValueMax: 10, score: 1 },
        { metricValueMin: 10, metricValueMax: 100, score: 0 },
      ],
      {
        'Total datacap': this.convertFilesize(totalDatacap),
        'Duplicated datacap': this.convertFilesize(duplicatedDatacap),
        'Percentage of duplicated datacap':
          percentageOfDuplicatedData.toFixed(2),
        'Percentage of duplicated datacap = 0': '2 points',
        'Percentage of duplicated datacap > 0 and <= 10': '1 point',
        'Percentage of duplicated datacap > 10': '0 points',
      },
    );
  }

  private async storeUniqueDataSetSizeScore(report, isOpenData: boolean) {
    const openDataScoreWeight = 1;
    const enterpriseScoreWeight = 1;

    const allocatorClients =
      await this.prismaService.allocator_report_client.findMany({
        where: {
          allocator_report_id: report.id,
        },
      });

    const totalClientsExpectedSizeOfSingleDataSet = allocatorClients.reduce(
      (acc, client) => acc + (client.expected_size_of_single_dataset ?? 0n),
      0n,
    );

    const totalClientsUniqDataSetSize = allocatorClients.reduce(
      (acc, client) => acc + (client.total_uniq_data_set_size ?? 0n),
      0n,
    );

    const ratio = !totalClientsExpectedSizeOfSingleDataSet
      ? 0
      : bigIntDiv(
          totalClientsUniqDataSetSize * 100n,
          totalClientsExpectedSizeOfSingleDataSet,
        );

    let score = 0;
    if (ratio < 100) {
      score = 1;
    } else if (ratio <= 120) {
      score = 2;
    }

    await this.storeScore(
      report.id,
      AllocatorScoringMetric.UNIQUE_DATA_SET_SIZE,
      ratio,
      0,
      null,
      score,
      openDataScoreWeight,
      enterpriseScoreWeight,
      isOpenData,
      'Unique dataset size',
      'Compares the actual unique data to what was declared by the client in their application (size of the one copy of the data set)',
      null,
      [
        { metricValueMin: 0, metricValueMax: 100, score: 1 },
        { metricValueMin: 100, metricValueMax: 120, score: 2 },
        { metricValueMin: 120, metricValueMax: null, score: 0 },
      ],
      {
        'Total expected size of single data set for all clients':
          this.convertFilesize(totalClientsExpectedSizeOfSingleDataSet),
        'Total unique data set size for all clients': this.convertFilesize(
          totalClientsUniqDataSetSize,
        ),
        'Ratio of unique data set size to expected size of single data set':
          ratio.toFixed(2),
        'Ratio >= 100 and < 120': '2 points',
        'Ratio < 100': '1 point',
        'Ratio > 120': '0 points',
      },
    );
  }

  private async storeEqualityOfDatacapDistribution(
    report,
    isOpenData: boolean,
  ) {
    const openDataScoreWeight = 2;
    const enterpriseScoreWeight = 2;

    const allocatorClients =
      await this.prismaService.allocator_report_client.findMany({
        where: {
          allocator_report_id: report.id,
        },
      });

    const allocatorClientsAllocations = allocatorClients.map(
      (client) => client.total_allocations,
    );

    const average = bigIntArrayAverage(allocatorClientsAllocations);
    const standardDeviation = this.calculateStandardDeviation(
      allocatorClientsAllocations,
    );

    const coefficientOfVariation =
      !average || !standardDeviation
        ? 0
        : bigIntDiv(standardDeviation * 100n, average);

    let score = 0;
    if (coefficientOfVariation < 40) {
      score = 2;
    } else if (coefficientOfVariation <= 60) {
      score = 1;
    }

    await this.storeScore(
      report.id,
      AllocatorScoringMetric.EQUALITY_OF_DATACAP_DISTRIBUTION,
      coefficientOfVariation,
      0,
      null,
      score,
      openDataScoreWeight,
      enterpriseScoreWeight,
      isOpenData,
      'Equality of datacap distribution',
      'Measures how is the allocator allocating datacap to clients',
      '%',
      [
        { metricValueMin: 0, metricValueMax: 40, score: 2 },
        { metricValueMin: 40, metricValueMax: 60, score: 1 },
        { metricValueMin: 60, metricValueMax: null, score: 0 },
      ],
      {
        'Average allocation per client': this.convertFilesize(average),
        'Standard deviation of allocations':
          this.convertFilesize(standardDeviation),
        'Coefficient of variation (%)': coefficientOfVariation.toFixed(2),
        'Coefficient of variation < 40': '2 points',
        'Coefficient of variation >= 40 and <= 60': '1 point',
        'Coefficient of variation > 60': '0 points',
      },
    );
  }

  private async storeClientDiversityScore(report, isOpenData: boolean) {
    const openDataScoreWeight = 2;
    const enterpriseScoreWeight = 2;

    const allocatorApplicationApprovedDate = (
      await this.allocatorService.getAllocatorRegistryInfo(report.allocator)
    )?.history?.approved;

    const monthsOfOperation = allocatorApplicationApprovedDate
      ? DateTime.now().diff(
          DateTime.fromJSDate(allocatorApplicationApprovedDate),
          'months',
        ).months
      : null;

    const clientDiversityRatio = monthsOfOperation
      ? report.clients_number / monthsOfOperation
      : 0;

    let score = 0;
    if (clientDiversityRatio > 0.6) {
      score = 2;
    } else if (clientDiversityRatio >= 0.4) {
      score = 1;
    }

    await this.storeScore(
      report.id,
      AllocatorScoringMetric.CLIENT_DIVERSITY,
      clientDiversityRatio,
      0,
      null,
      score,
      openDataScoreWeight,
      enterpriseScoreWeight,
      isOpenData,
      'Client diversity',
      'Measures how many clients is an allocator working with, based on the number of months the allocator has been operating',
      null,
      [
        { metricValueMin: 0.6, metricValueMax: null, score: 2 },
        { metricValueMin: 0.4, metricValueMax: 0.6, score: 1 },
        { metricValueMin: 0, metricValueMax: 0.4, score: 0 },
      ],
      {
        'Number of clients': report.clients_number,
        'Months of operation': monthsOfOperation?.toFixed(2),
        'Client diversity ratio (clients / months)':
          clientDiversityRatio.toFixed(2),
        'Client diversity ratio > 0.6': '2 points',
        'Client diversity ratio >= 0.4': '1 point',
        'Client diversity ratio < 0.4': '0 points',
      },
    );
  }

  private async storeClientPreviousApplicationsScore(
    report,
    isOpenData: boolean,
  ) {
    const openDataScoreWeight = 1;
    const enterpriseScoreWeight = 1;

    const allocatorClients =
      await this.prismaService.allocator_report_client.findMany({
        where: {
          allocator_report_id: report.id,
        },
        select: {
          allocations_number: true,
        },
      });

    const returningClients = allocatorClients.filter(
      (client) => client.allocations_number > 1,
    ).length;

    const totalClients = allocatorClients.length;

    const returningClientsPercentage = !totalClients
      ? 0
      : (returningClients / totalClients) * 100;

    let score = 0;
    if (returningClientsPercentage > 75) {
      score = 2;
    } else if (returningClientsPercentage >= 60) {
      score = 1;
    }

    await this.storeScore(
      report.id,
      AllocatorScoringMetric.CLIENT_PREVIOUS_APPLICATIONS,
      returningClientsPercentage,
      0,
      100,
      score,
      openDataScoreWeight,
      enterpriseScoreWeight,
      isOpenData,
      'Client previous applications',
      'Measures number of clients that are returning customers',
      '%',
      [
        { metricValueMin: 75, metricValueMax: 100, score: 2 },
        { metricValueMin: 60, metricValueMax: 75, score: 1 },
        { metricValueMin: 0, metricValueMax: 60, score: 0 },
      ],
      {
        'Number of returning clients': returningClients,
        'Total number of clients': totalClients,
        'Percentage of returning clients':
          returningClientsPercentage.toFixed(2),
        'Percentage of returning clients > 75': '2 points',
        'Percentage of returning clients >= 60': '1 point',
        'Percentage of returning clients < 60': '0 points',
      },
    );
  }
}
