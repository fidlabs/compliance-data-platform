import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import {
  AllocatorScoringMetric,
  StorageProviderIpniReportingStatus,
} from 'prisma/generated/client';
import { DateTime } from 'luxon';
import {
  arrayAverage,
  bigIntDiv,
  bigIntMul,
  stringToDate,
  stringToNumber,
} from 'src/utils/utils';
import { AllocatorService } from '../allocator/allocator.service';
import { filesize } from 'filesize';
import { Cacheable } from 'src/utils/cacheable';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { DataType } from 'src/controller/allocators/types.allocators';
import { getAllocatorLatestScores } from 'prisma/generated/client/sql';

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
      include: {
        clients: {
          include: {
            replica_distribution: true,
            cid_sharing: true,
          },
        },
        client_allocations: true,
        storage_provider_distribution: {
          include: {
            location: true,
          },
        },
      },
    });

    const allocatorDataType = await this.allocatorService.getAllocatorDataType(
      report.allocator,
    );

    if (!allocatorDataType) {
      this.logger.warn(
        `Skipping scoring calculations for round != 6 for ${report.allocator}`,
      );

      return;
    }

    await this.storeIPNIReportingScore(report, allocatorDataType);
    await this.storeUrlFinderRetrievabilityScore(report, allocatorDataType);
    await this.storeCIDSharingScore(report, allocatorDataType);
    await this.storeDuplicatedDataScore(report, allocatorDataType);
    await this.storeUniqueDataSetSizeScore(report, allocatorDataType);
    await this.storeEqualityOfDatacapDistribution(report, allocatorDataType);
    await this.storeClientDiversityScore(report, allocatorDataType);
    await this.storeClientPreviousApplicationsScore(report, allocatorDataType);
  }

  public async getLatestScores(dataType?: DataType) {
    return await this.prismaService.$queryRawTyped(
      getAllocatorLatestScores(dataType),
    );
  }

  @Cacheable({ ttl: 1000 * 60 * 30 }) // 30 minutes
  public async getTotalScoreAverage(
    dataType: DataType,
  ): Promise<number | null> {
    const latestScores = await this.getLatestScores(dataType);

    return arrayAverage(latestScores.map((s) => s.totalScore));
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

  private standardDeviation(values: number[]): number | null {
    if (!values?.length) return null;

    const average = arrayAverage(values);

    const variance =
      values.reduce((acc, val) => acc + (val - average) ** 2, 0) /
      values.length;

    return Math.sqrt(variance);
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
    >`select avg("metric_value")::float as "avg"
      from (select distinct on ("ar"."allocator") "ar"."allocator",
                                                  "arsr"."metric_value"
            from "allocator_report" "ar"
                   join "allocator_report_scoring_result" "arsr"
                        on "ar"."id" = "arsr"."allocator_report_id"
                   join "allocator" on "ar"."allocator" = "allocator"."id"
            where "arsr"."metric"::text = ${metric}
              and "allocator"."is_metaallocator" = false
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
    >`select max("metric_value")::float as "max"
      from (select distinct on ("ar"."allocator") "ar"."allocator",
                                                  "arsr"."metric_value"
            from "allocator_report" "ar"
                   join "allocator_report_scoring_result" "arsr"
                        on "ar"."id" = "arsr"."allocator_report_id"
                   join "allocator" on "ar"."allocator" = "allocator"."id"
            where "arsr"."metric"::text = ${metric}
              and "allocator"."is_metaallocator" = false
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
    dataType: DataType,
    metricName: string,
    metricDescription: string,
    metricUnit: string | null,
    metricAverage: number | null,
    scoreRanges: {
      metricValueMin: number | null;
      metricValueMax: number | null;
      score: number;
    }[],
    metadata?: object,
  ) {
    const isOpenData = dataType === DataType.openData;

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

    metricAverage ??= await this.getMetricAverage(metric);

    await this.prismaService.allocator_report_scoring_result.create({
      data: {
        allocator_report_id: reportId,
        metric: metric,
        metric_value: metricValue,
        metric_average: metricAverage,
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

  private computeClientWeight(lastDatacapSpent: Date | null): number {
    if (!lastDatacapSpent) return 0;

    const daysAgo = Math.floor(
      (Date.now() - lastDatacapSpent.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysAgo <= 60) return 1;

    const decayDays = daysAgo - 60;
    const halfLife = 120; // days

    return Math.exp(-decayDays / halfLife);
  }

  private async storeIPNIReportingScore(report, dataType: DataType) {
    const openDataScoreWeight = 3;
    const enterpriseScoreWeight = 0;

    const [_ipniOKDatacap, _totalDatacap] = await Promise.all([
      this.prismaService.allocator_report_storage_provider_distribution.aggregate(
        {
          _sum: {
            total_deal_size: true,
          },
          where: {
            allocator_report_id: report.id,
            ipni_reporting_status: StorageProviderIpniReportingStatus.OK,
          },
        },
      ),
      this.prismaService.allocator_report_storage_provider_distribution.aggregate(
        {
          _sum: {
            total_deal_size: true,
          },
          where: {
            allocator_report_id: report.id,
          },
        },
      ),
    ]);

    const ipniOKDatacap = _ipniOKDatacap._sum.total_deal_size || 0n;
    const totalDatacap = _totalDatacap._sum.total_deal_size || 0n;

    const percentageOfIPNIOKDatacap = totalDatacap
      ? bigIntDiv(ipniOKDatacap * 100n, totalDatacap)
      : 0;

    let score = 0;
    if (percentageOfIPNIOKDatacap > 55) {
      score = 3;
    } else if (percentageOfIPNIOKDatacap >= 50) {
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
      dataType,
      'IPNI reporting',
      'Measures if data is correctly reported and indexed in IPNI',
      '%',
      null,
      [
        { metricValueMin: 0, metricValueMax: 50, score: 0 },
        { metricValueMin: 50, metricValueMax: 55, score: 1 },
        { metricValueMin: 55, metricValueMax: 100, score: 3 },
      ],
      {
        'IPNI OK Datacap': this.convertFilesize(ipniOKDatacap),
        'Total Datacap': this.convertFilesize(totalDatacap),
        'Percentage of IPNI OK datacap':
          percentageOfIPNIOKDatacap.toString() + '%',
        'Percentage of IPNI OK datacap > 55': '3 points',
        'Percentage of IPNI OK datacap >= 50': '1 point',
        'Percentage of IPNI OK datacap < 50': '0 points',
      },
    );
  }

  // DEPRECATED: replaced by URL Finder retrievability
  private async storeHttpRetrievabilityScore(report, dataType: DataType) {
    const openDataScoreWeight = 1;
    const enterpriseScoreWeight = 1;

    const allAllocatorsRetrievabilities = await this.prismaService.$queryRaw<
      {
        success_rate: number;
      }[]
    >`
      select distinct on ("ar"."allocator")
             coalesce("ar"."avg_retrievability_success_rate_http", 0) as "success_rate"
      from "allocator_report" "ar"
             join "allocator" on "ar"."allocator" = "allocator"."id"
        and "allocator"."is_metaallocator" = false
      group by "ar"."allocator", "ar"."create_date", "ar"."avg_retrievability_success_rate_http"
      order by "ar"."allocator", "ar"."create_date" desc;`;

    const sortedRetrievabilities = allAllocatorsRetrievabilities
      .map((a) => a.success_rate || 0)
      .sort((a, b) => a - b);

    const _50thPercentile =
      this.calculateNthPercentile(sortedRetrievabilities, 50) * 100;

    const _75thPercentile =
      this.calculateNthPercentile(sortedRetrievabilities, 75) * 100;

    const allocatorRetrievability =
      (report.avg_retrievability_success_rate_http ?? 0) * 100;

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
      dataType,
      'HTTP retrievability',
      'Measures if data is available to anyone on the network',
      '%',
      stringToNumber(arrayAverage(sortedRetrievabilities).toFixed(4)) * 100,
      // prettier-ignore
      [
        { metricValueMin: 0, metricValueMax: _50thPercentile, score: 0 },
        { metricValueMin: _50thPercentile, metricValueMax: _75thPercentile, score: 1 },
        { metricValueMin: _75thPercentile, metricValueMax: 100, score: 3 },
      ],
      {
        'Allocator retrievability': allocatorRetrievability?.toFixed(2) + '%',
        '50th percentile of all allocators retrievabilities':
          _50thPercentile?.toFixed(2) + '%',
        '75th percentile of all allocators retrievabilities':
          _75thPercentile?.toFixed(2) + '%',
        'Allocator retrievability > 75th percentile': '3 points',
        'Allocator retrievability > 50th percentile': '1 point',
        'Allocator retrievability <= 50th percentile': '0 points',
      },
    );
  }

  private async storeUrlFinderRetrievabilityScore(report, dataType: DataType) {
    const openDataScoreWeight = 5;
    const enterpriseScoreWeight = 0;

    const allAllocatorsRetrievabilities = await this.prismaService.$queryRaw<
      {
        success_rate: number;
      }[]
    >`
      select distinct on ("ar"."allocator")
             coalesce("ar"."avg_retrievability_success_rate_url_finder", 0) as "success_rate"
      from "allocator_report" "ar"
             join "allocator" on "ar"."allocator" = "allocator"."id"
        and "allocator"."is_metaallocator" = false
      group by "ar"."allocator", "ar"."create_date", "ar"."avg_retrievability_success_rate_url_finder"
      order by "ar"."allocator", "ar"."create_date" desc;`;

    const sortedRetrievabilities = allAllocatorsRetrievabilities
      .map((a) => a.success_rate || 0)
      .sort((a, b) => a - b);

    const _50thPercentile =
      (this.calculateNthPercentile(sortedRetrievabilities, 50) ?? 0) * 100;

    const _25thPercentile =
      (this.calculateNthPercentile(sortedRetrievabilities, 25) ?? 0) * 100;

    const allocatorRetrievability =
      (report.avg_retrievability_success_rate_url_finder ?? 0) * 100;

    let score = 0;
    if (allocatorRetrievability > _50thPercentile) {
      score = 3;
    } else if (allocatorRetrievability > _25thPercentile) {
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
      dataType,
      'RPA retrievability',
      'Verifies real retrievability but from known actors',
      '%',
      stringToNumber(arrayAverage(sortedRetrievabilities).toFixed(4)) * 100,
      // prettier-ignore
      [
        { metricValueMin: 0, metricValueMax: _25thPercentile, score: 0 },
        { metricValueMin: _25thPercentile, metricValueMax: _50thPercentile, score: 1 },
        { metricValueMin: _50thPercentile, metricValueMax: 100, score: 3 },
      ],
      {
        'Allocator RPA retrievability':
          allocatorRetrievability?.toFixed(2) + '%',
        '25th Percentile of all allocators RPA retrievabilities':
          _25thPercentile?.toFixed(2) + '%',
        '50th Percentile of all allocators RPA retrievabilities':
          _50thPercentile?.toFixed(2) + '%',
        'Allocator RPA retrievability > 50th Percentile': '3 points',
        'Allocator RPA retrievability > 25th Percentile': '1 point',
        'Allocator RPA retrievability <= 25th Percentile': '0 points',
      },
    );
  }

  private async storeCIDSharingScore(report, dataType: DataType) {
    const openDataScoreWeight = 3;
    const enterpriseScoreWeight = 3;

    const allocatorClientsTotalAllocation = report.clients.reduce(
      (acc, client) =>
        acc +
        bigIntMul(
          client.total_allocations,
          this.computeClientWeight(client.last_datacap_spent),
        ),
      0n,
    );

    const allocatorClientsWithCIDSharingAllocations = report.clients.reduce(
      (acc, client) =>
        acc +
        (client.cid_sharing
          ? client.cid_sharing.reduce(
              (acc, cidSharing) =>
                acc +
                bigIntMul(
                  cidSharing.total_deal_size,
                  this.computeClientWeight(client.last_datacap_spent),
                ),
              0n,
            )
          : 0n),
      0n,
    );

    const percentageOfCIDSharing = allocatorClientsTotalAllocation
      ? bigIntDiv(
          allocatorClientsWithCIDSharingAllocations * 100n,
          allocatorClientsTotalAllocation,
        )
      : 0;

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
      dataType,
      'CID sharing',
      'Measures the same CID shared between different clients',
      '%',
      null,
      [
        { metricValueMin: 0, metricValueMax: 0, score: 2 },
        { metricValueMin: 0, metricValueMax: 2, score: 1 },
        { metricValueMin: 2, metricValueMax: 100, score: 0 },
      ],
      {
        'Total allocations (weighted)': this.convertFilesize(
          allocatorClientsTotalAllocation,
        ),
        'Allocations with CID sharing (weighted)': this.convertFilesize(
          allocatorClientsWithCIDSharingAllocations,
        ),
        'Percentage of allocations with CID sharing':
          percentageOfCIDSharing.toFixed(2) + '%',
        'Percentage of allocations with CID sharing = 0': '2 points',
        'Percentage of allocations with CID sharing > 0 and <= 2': '1 point',
        'Percentage of allocations with CID sharing > 2': '0 points',
      },
    );
  }

  private async storeDuplicatedDataScore(report, dataType: DataType) {
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

    const percentageOfDuplicatedData = totalDatacap
      ? bigIntDiv(duplicatedDatacap * 100n, totalDatacap)
      : 0;

    let score = 0;
    if (percentageOfDuplicatedData <= 0.25) {
      score = 2;
    } else if (percentageOfDuplicatedData <= 5) {
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
      dataType,
      'Duplicated data',
      'Measures if this is the same car file that is sealed on the same SP',
      '%',
      null,
      [
        { metricValueMin: 0, metricValueMax: 0.25, score: 2 },
        { metricValueMin: 0.25, metricValueMax: 5, score: 1 },
        { metricValueMin: 5, metricValueMax: 100, score: 0 },
      ],
      {
        'Total datacap': this.convertFilesize(totalDatacap),
        'Duplicated datacap': this.convertFilesize(duplicatedDatacap),
        'Percentage of duplicated datacap':
          percentageOfDuplicatedData.toFixed(2) + '%',
        'Percentage of duplicated datacap <= 0.25': '2 points',
        'Percentage of duplicated datacap <= 5': '1 point',
        'Percentage of duplicated datacap > 5': '0 points',
      },
    );
  }

  private async storeUniqueDataSetSizeScore(report, dataType: DataType) {
    const openDataScoreWeight = 1;
    const enterpriseScoreWeight = 1;

    const totalClientsExpectedSizeOfSingleDataSet = report.clients.reduce(
      (acc, client) =>
        acc +
        bigIntMul(
          client.expected_size_of_single_dataset ?? 0n,
          this.computeClientWeight(client.last_datacap_spent),
        ),
      0n,
    );

    const totalClientsUniqDataSetSize = report.clients.reduce(
      (acc, client) =>
        acc +
        bigIntMul(
          client.total_uniq_data_set_size ?? 0n,
          this.computeClientWeight(client.last_datacap_spent),
        ),
      0n,
    );

    const ratio = totalClientsExpectedSizeOfSingleDataSet
      ? bigIntDiv(
          totalClientsUniqDataSetSize * 100n,
          totalClientsExpectedSizeOfSingleDataSet,
        )
      : 0;

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
      dataType,
      'Unique dataset size',
      'Compares the actual unique data to what was declared by the client in their application (size of the one copy of the data set)',
      null,
      null,
      [
        { metricValueMin: 0, metricValueMax: 100, score: 1 },
        { metricValueMin: 100, metricValueMax: 120, score: 2 },
        { metricValueMin: 120, metricValueMax: null, score: 0 },
      ],
      {
        'Total expected size of single data set (weighted)':
          this.convertFilesize(totalClientsExpectedSizeOfSingleDataSet),
        'Total unique data set size (weighted)': this.convertFilesize(
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

  private async storeEqualityOfDatacapDistribution(report, dataType: DataType) {
    const openDataScoreWeight = 2;
    const enterpriseScoreWeight = 2;

    const allocatorClientsAllocations = report.clients.map((client) =>
      bigIntMul(
        client.total_allocations,
        this.computeClientWeight(client.last_datacap_spent),
      ),
    );

    const totalAllocations = allocatorClientsAllocations.reduce(
      (acc, val) => acc + val,
      0n,
    );

    const equalityRatioForEachClient = allocatorClientsAllocations.map(
      (allocation) =>
        totalAllocations
          ? bigIntDiv(
              allocation * BigInt(report.clients.length),
              totalAllocations,
            )
          : 0,
    );

    const standardDeviation =
      this.standardDeviation(equalityRatioForEachClient) ?? 0;

    let score = 0;
    if (standardDeviation >= 0.9 && standardDeviation <= 1.1) {
      score = 3;
    } else if (
      (standardDeviation >= 0.7 && standardDeviation < 0.9) ||
      (standardDeviation > 1.1 && standardDeviation <= 1.3)
    ) {
      score = 2;
    } else if (
      (standardDeviation >= 0.5 && standardDeviation < 0.7) ||
      (standardDeviation > 1.3 && standardDeviation <= 1.5)
    ) {
      score = 1;
    }

    await this.storeScore(
      report.id,
      AllocatorScoringMetric.EQUALITY_OF_DATACAP_DISTRIBUTION,
      standardDeviation,
      0,
      null,
      score,
      openDataScoreWeight,
      enterpriseScoreWeight,
      dataType,
      'Equality of datacap distribution',
      'Measures how is the allocator allocating datacap to clients',
      null,
      null,
      [
        { metricValueMin: 0.9, metricValueMax: 1.1, score: 3 },
        { metricValueMin: 0.7, metricValueMax: 0.9, score: 2 },
        { metricValueMin: 1.1, metricValueMax: 1.3, score: 2 },
        { metricValueMin: 0.5, metricValueMax: 0.7, score: 1 },
        { metricValueMin: 1.3, metricValueMax: 1.5, score: 1 },
        { metricValueMin: 0, metricValueMax: 0.5, score: 0 },
        { metricValueMin: 1.5, metricValueMax: null, score: 0 },
      ],
      // prettier-ignore
      {
        'Total allocations (weighted)': this.convertFilesize(totalAllocations),
        'Number of clients': BigInt(report.clients.length),
        'Standard deviation of equality ratio': standardDeviation.toFixed(2),
        'Standard deviation >= 0.9 and <= 1.1': '3 points',
        'Standard deviation (>= 0.7 and < 0.9) or (> 1.1 and <= 1.3)': '2 points',
        'Standard deviation (>= 0.5 and < 0.7) or (> 1.3 and <= 1.5)': '1 point',
        'Standard deviation < 0.5 or > 1.5': '0 points',
      },
    );
  }

  private async storeClientDiversityScore(report, dataType: DataType) {
    const openDataScoreWeight = 2;
    const enterpriseScoreWeight = 2;

    const allocatorFirstAuditDate = (
      await this.allocatorService.getAllocatorRegistryInfo(report.allocator)
    )?.audits?.[0]?.ended;

    const monthsOfOperation = allocatorFirstAuditDate
      ? DateTime.now().diff(
          DateTime.fromJSDate(stringToDate(allocatorFirstAuditDate)),
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
      dataType,
      'Client diversity',
      'Measures how many clients is an allocator working with, based on the number of months the allocator has been operating',
      null,
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
    dataType: DataType,
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

    const returningClientsPercentage = totalClients
      ? (returningClients / totalClients) * 100
      : 0;

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
      dataType,
      'Client previous applications',
      'Measures number of clients that are returning customers',
      '%',
      null,
      [
        { metricValueMin: 75, metricValueMax: 100, score: 2 },
        { metricValueMin: 60, metricValueMax: 75, score: 1 },
        { metricValueMin: 0, metricValueMax: 60, score: 0 },
      ],
      {
        'Number of returning clients': returningClients,
        'Total number of clients': totalClients,
        'Percentage of returning clients':
          returningClientsPercentage.toFixed(2) + '%',
        'Percentage of returning clients > 75': '2 points',
        'Percentage of returning clients >= 60': '1 point',
        'Percentage of returning clients < 60': '0 points',
      },
    );
  }
}
