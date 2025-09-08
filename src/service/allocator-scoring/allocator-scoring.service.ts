import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import {
  AllocatorScoringMetric,
  StorageProviderIpniReportingStatus,
} from 'prisma/generated/client';
import { DateTime } from 'luxon';
import { bigIntArrayAverage, bigIntDiv, bigIntSqrt } from 'src/utils/utils';
import { AllocatorService } from '../allocator/allocator.service';
import { filesize } from 'filesize';

@Injectable()
export class AllocatorScoringService {
  private readonly logger = new Logger(AllocatorScoringService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly allocatorService: AllocatorService,
  ) {}

  public async storeScoring(reportId: string) {
    await this.storeIPNIReportingScore(reportId);
    await this.storeHttpRetrievabilityScore(reportId);
    await this.storeUrlFinderRetrievabilityScore(reportId);
    await this.storeCIDSharingScore(reportId);
    await this.storeDuplicatedDataScore(reportId);
    await this.storeUniqueDataSetSizeScore(reportId);
    await this.storeEqualityOfDatacapDistribution(reportId);
    await this.storeClientDiversityScore(reportId);
    await this.storeClientPreviousApplicationsScore(reportId);
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

  private async storeScore(
    reportId: string,
    metric: AllocatorScoringMetric,
    score: number,
    metadata?: object,
  ) {
    // prettier-ignore
    const metricNames = new Map<AllocatorScoringMetric, string>([
      [AllocatorScoringMetric.IPNI_REPORTING, 'IPNI reporting'],
      [AllocatorScoringMetric.HTTP_RETRIEVABILITY, 'HTTP retrievability'],
      [AllocatorScoringMetric.URL_FINDER_RETRIEVABILITY, 'RPA retrievability'],
      [AllocatorScoringMetric.CID_SHARING, 'CID sharing'],
      [AllocatorScoringMetric.DUPLICATED_DATA, 'Duplicated data'],
      [AllocatorScoringMetric.UNIQUE_DATA_SET_SIZE, 'Unique dataset size'],
      [AllocatorScoringMetric.EQUALITY_OF_DATACAP_DISTRIBUTION, 'Equality of datacap distribution'],
      [AllocatorScoringMetric.CLIENT_DIVERSITY, 'Client diversity'],
      [AllocatorScoringMetric.CLIENT_PREVIOUS_APPLICATIONS, 'Client previous applications'],
    ]);

    // prettier-ignore
    const metricDescriptions = new Map<AllocatorScoringMetric, string>([
      [AllocatorScoringMetric.IPNI_REPORTING, 'Measures if data is correctly reported and indexed in IPNI'],
      [AllocatorScoringMetric.HTTP_RETRIEVABILITY, 'Measures if data is available to anyone on the network'],
      [AllocatorScoringMetric.URL_FINDER_RETRIEVABILITY, 'Verifies real retrievability but from known actors'],
      [AllocatorScoringMetric.CID_SHARING, 'Measures the same CID shared between different clients'],
      [AllocatorScoringMetric.DUPLICATED_DATA, 'Measures if this the same car file that is sealed on the same SP'],
      [AllocatorScoringMetric.UNIQUE_DATA_SET_SIZE, 'Compares the actual unique data to what was declared by the client in their application (size of the one copy of the data set)'],
      [AllocatorScoringMetric.EQUALITY_OF_DATACAP_DISTRIBUTION, 'Measures how is the allocator allocating DC to clients'],
      [AllocatorScoringMetric.CLIENT_DIVERSITY, 'Measures how many clients is an allocator working with, based on the number of months the allocator has been operating'],
      [AllocatorScoringMetric.CLIENT_PREVIOUS_APPLICATIONS, 'Measures number of clients that are returning customers'],
    ]);

    await this.prismaService.allocator_report_scoring_results.create({
      data: {
        allocator_report_id: reportId,
        metric: metric,
        metricName: metricNames.get(metric),
        metricDescription: metricDescriptions.get(metric),
        score: score,
        metadata: metadata
          ? Object.entries(metadata).map(
              ([key, value]) => `${key}: ${String(value)}`,
            )
          : null,
      },
    });
  }

  // TODO open / enterprise wages

  private async storeIPNIReportingScore(reportId: string) {
    const ipniOKDatacap =
      (
        await this.prismaService.allocator_report_storage_provider_distribution.aggregate(
          {
            _sum: {
              total_deal_size: true,
            },
            where: {
              allocator_report_id: reportId,
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
              allocator_report_id: reportId,
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
      reportId,
      AllocatorScoringMetric.IPNI_REPORTING,
      score,
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

  private async storeHttpRetrievabilityScore(reportId: string) {
    const report = await this.prismaService.allocator_report.findFirst({
      where: {
        id: reportId,
      },
      select: {
        create_date: true,
        allocator: true,
      },
    });

    const reportCreateWeekAgo = DateTime.fromJSDate(report.create_date)
      .startOf('week')
      .minus({ weeks: 2 }) // no data is available for the current week, so we look one week back // TODO
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
      allAllocatorsRetrievabilities.find(
        (a) => a.allocator === report.allocator,
      )?.avg_weighted_retrievability_success_rate_http ?? 0;

    const sortedRetrievabilities = allAllocatorsRetrievabilities
      .map((a) => a.avg_weighted_retrievability_success_rate_http || 0)
      .sort((a, b) => a - b);

    const _50thPercentile = this.calculateNthPercentile(
      sortedRetrievabilities,
      50,
    );

    const _75thPercentile = this.calculateNthPercentile(
      sortedRetrievabilities,
      75,
    );

    let score = 0;
    if (allocatorRetrievability > _75thPercentile) {
      score = 3;
    } else if (allocatorRetrievability > _50thPercentile) {
      score = 1;
    }

    await this.storeScore(
      reportId,
      AllocatorScoringMetric.HTTP_RETRIEVABILITY,
      score,
      {
        'Allocator retrievability': allocatorRetrievability?.toFixed(2),
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

  private async storeUrlFinderRetrievabilityScore(reportId: string) {
    const report = await this.prismaService.allocator_report.findFirst({
      where: {
        id: reportId,
      },
      select: {
        create_date: true,
        allocator: true,
        avg_retrievability_success_rate_url_finder: true,
      },
    });

    const reportCreateDayAgo = DateTime.fromJSDate(report.create_date)
      .startOf('day')
      .minus({ day: 4 }) // today's data might be incomplete, so we look one day back // TODO
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
      this.calculateNthPercentile(sortedRetrievabilities, 50) ?? 0;

    const _75thPercentile =
      this.calculateNthPercentile(sortedRetrievabilities, 75) ?? 0;

    let score = 0;
    if (report.avg_retrievability_success_rate_url_finder > _75thPercentile) {
      score = 3;
    } else if (
      report.avg_retrievability_success_rate_url_finder > _50thPercentile
    ) {
      score = 1;
    }

    await this.storeScore(
      reportId,
      AllocatorScoringMetric.URL_FINDER_RETRIEVABILITY,
      score,
      {
        'Allocator retrievability':
          report.avg_retrievability_success_rate_url_finder?.toFixed(2),
        '50th Percentile': _50thPercentile?.toFixed(2),
        '75th Percentile': _75thPercentile?.toFixed(2),
        'Allocator retrievability > 75th Percentile': '3 points',
        'Allocator retrievability > 50th Percentile': '1 point',
        'Allocator retrievability <= 50th Percentile': '0 points',
      },
    );
  }

  private async storeCIDSharingScore(reportId: string) {
    const allocatorClients =
      await this.prismaService.allocator_report_client.findMany({
        where: {
          allocator_report_id: reportId,
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

    await this.storeScore(reportId, AllocatorScoringMetric.CID_SHARING, score, {
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
    });
  }

  private async storeDuplicatedDataScore(reportId: string) {
    const providerDistribution =
      await this.prismaService.allocator_report_storage_provider_distribution.findMany(
        {
          where: {
            allocator_report_id: reportId,
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
    } else if (
      percentageOfDuplicatedData > 0 &&
      percentageOfDuplicatedData <= 10
    ) {
      score = 1;
    }

    await this.storeScore(
      reportId,
      AllocatorScoringMetric.DUPLICATED_DATA,
      score,
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

  private async storeUniqueDataSetSizeScore(reportId: string) {
    const allocatorClients =
      await this.prismaService.allocator_report_client.findMany({
        where: {
          allocator_report_id: reportId,
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
      reportId,
      AllocatorScoringMetric.UNIQUE_DATA_SET_SIZE,
      score,
      {
        'Total expected size of single data set for all clients':
          this.convertFilesize(totalClientsExpectedSizeOfSingleDataSet),
        'Total unique data set size for all clients': this.convertFilesize(
          totalClientsUniqDataSetSize,
        ),
        'Ratio of unique data set size to expected size of single data set':
          ratio.toFixed(2),
        'Ratio >= 100 < 120': '2 points',
        'Ratio < 100': '1 point',
        'Ratio > 120': '0 points',
      },
    );
  }

  private async storeEqualityOfDatacapDistribution(reportId: string) {
    const allocatorClients =
      await this.prismaService.allocator_report_client.findMany({
        where: {
          allocator_report_id: reportId,
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
      reportId,
      AllocatorScoringMetric.EQUALITY_OF_DATACAP_DISTRIBUTION,
      score,
      {
        'Average allocation per client': this.convertFilesize(average),
        'Standard deviation of allocations':
          this.convertFilesize(standardDeviation),
        'Coefficient of variation (%)': this.convertFilesize(
          coefficientOfVariation,
        ),
        'Coefficient of variation < 40': '2 points',
        'Coefficient of variation >= 40 and <= 60': '1 point',
        'Coefficient of variation > 60': '0 points',
      },
    );
  }

  private async storeClientDiversityScore(reportId: string) {
    const report = await this.prismaService.allocator_report.findFirst({
      where: {
        id: reportId,
      },
      select: {
        allocator: true,
        clients_number: true,
      },
    });

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
      reportId,
      AllocatorScoringMetric.CLIENT_DIVERSITY,
      score,
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

  private async storeClientPreviousApplicationsScore(reportId: string) {
    const allocatorClients =
      await this.prismaService.allocator_report_client.findMany({
        where: {
          allocator_report_id: reportId,
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
      reportId,
      AllocatorScoringMetric.CLIENT_PREVIOUS_APPLICATIONS,
      score,
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
