import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/db/prisma.service';
import { ClientReportCheck } from 'prisma/generated/client';
import { round } from 'lodash';
import { StorageProviderIpniReportingStatus } from 'prisma/generated/client';
import { GlifAutoVerifiedAllocatorId } from 'src/utils/constants';
import { envNotSet } from 'src/utils/utils';

@Injectable()
export class ClientReportChecksService {
  public CLIENT_REPORT_MAX_PROVIDER_DEAL_PERCENTAGE: number;
  public CLIENT_REPORT_MAX_DUPLICATION_PERCENTAGE: number;
  public CLIENT_REPORT_MAX_PERCENTAGE_FOR_LOW_REPLICA: number;
  public CLIENT_REPORT_MAX_LOW_REPLICA_THRESHOLD: number;
  public CLIENT_REPORT_MAX_PERCENTAGE_FOR_REQUIRED_COPIES: number;

  private readonly logger = new Logger(ClientReportChecksService.name);

  // prettier-ignore
  constructor(
    configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    this.CLIENT_REPORT_MAX_PROVIDER_DEAL_PERCENTAGE = configService.get<number>(
      'CLIENT_REPORT_MAX_PROVIDER_DEAL_PERCENTAGE',
    );
    this.CLIENT_REPORT_MAX_DUPLICATION_PERCENTAGE = configService.get<number>(
      'CLIENT_REPORT_MAX_DUPLICATION_PERCENTAGE',
    );
    this.CLIENT_REPORT_MAX_PERCENTAGE_FOR_LOW_REPLICA = configService.get<number>(
      'CLIENT_REPORT_MAX_PERCENTAGE_FOR_LOW_REPLICA',
    );
    this.CLIENT_REPORT_MAX_LOW_REPLICA_THRESHOLD = configService.get<number>(
      'CLIENT_REPORT_MAX_LOW_REPLICA_THRESHOLD',
    );
    this.CLIENT_REPORT_MAX_PERCENTAGE_FOR_REQUIRED_COPIES = configService.get<number>(
      'CLIENT_REPORT_MAX_PERCENTAGE_FOR_REQUIRED_COPIES',
    );
  }

  public async storeReportChecks(reportId: bigint) {
    await this.storeMultipleAllocators(reportId);
    await this.storeStorageProviderDistributionChecks(reportId);
    await this.storeDealDataReplicationChecks(reportId);
    await this.storeDealDataSharedWithOtherClientsChecks(reportId);
  }

  private async storeStorageProviderDistributionChecks(reportId: bigint) {
    await this.storeProvidersExceedingProviderDeal(reportId);
    await this.storeProvidersExceedingMaxDuplicationPercentage(reportId);
    await this.storeProvidersWithUnknownLocation(reportId);
    await this.storeProvidersInSameLocation(reportId);
    await this.storeProvidersRetrievability(reportId);
    await this.storeProvidersIPNIMisreporting(reportId);
    await this.storeProvidersIPNINotReporting(reportId);
  }

  private async storeDealDataReplicationChecks(reportId: bigint) {
    await this.storeDealDataLowReplica(reportId);
    await this.storeDealDataNotEnoughCopies(reportId);
  }

  private async storeDealDataSharedWithOtherClientsChecks(reportId: bigint) {
    await this.storeDealDataSharedWithOtherClientsCidSharing(reportId);
  }

  private async storeProvidersExceedingProviderDeal(reportId: bigint) {
    if (envNotSet(this.CLIENT_REPORT_MAX_PROVIDER_DEAL_PERCENTAGE)) {
      this.logger.warn(
        `CLIENT_REPORT_MAX_PROVIDER_DEAL_PERCENTAGE env is not set; skipping check`,
      );

      return;
    }

    const providerDistribution =
      await this.prismaService.client_report_storage_provider_distribution.findMany(
        {
          where: {
            client_report_id: reportId,
          },
        },
      );

    const total = providerDistribution.reduce(
      (a, c) => a + c.total_deal_size,
      0n,
    );

    const providersExceedingProviderDeal =
      total === 0n
        ? []
        : providerDistribution
            .filter(
              (provider) =>
                Number((provider.total_deal_size * 10000n) / total) / 100 >
                this.CLIENT_REPORT_MAX_PROVIDER_DEAL_PERCENTAGE,
            )
            .map((provider) => provider.provider);

    const checkPassed = providersExceedingProviderDeal.length === 0;

    await this.prismaService.client_report_check_result.create({
      data: {
        client_report_id: reportId,
        check:
          ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_EXCEED_PROVIDER_DEAL,
        result: checkPassed,
        metadata: {
          violating_ids: providersExceedingProviderDeal,
          max_provider_deal_percentage:
            this.CLIENT_REPORT_MAX_PROVIDER_DEAL_PERCENTAGE,
          max_providers_exceeding_provider_deal: 0,
          providers_exceeding_provider_deal:
            providersExceedingProviderDeal.length,
          msg: checkPassed
            ? `Storage provider distribution looks healthy`
            : `${providersExceedingProviderDeal.length} storage providers sealed more than ${this.CLIENT_REPORT_MAX_PROVIDER_DEAL_PERCENTAGE}% of total datacap`,
        },
      },
    });
  }

  private async storeProvidersExceedingMaxDuplicationPercentage(
    reportId: bigint,
  ) {
    if (envNotSet(this.CLIENT_REPORT_MAX_DUPLICATION_PERCENTAGE)) {
      this.logger.warn(
        `CLIENT_REPORT_MAX_DUPLICATION_PERCENTAGE env is not set; skipping check`,
      );

      return;
    }

    const providerDistribution =
      await this.prismaService.client_report_storage_provider_distribution.findMany(
        {
          where: {
            client_report_id: reportId,
          },
        },
      );

    const providersExceedingMaxDuplicationPercentage = providerDistribution
      .filter(
        (provider) =>
          ((provider.total_deal_size - provider.unique_data_size) * 10000n) /
            provider.total_deal_size /
            100n >
          this.CLIENT_REPORT_MAX_DUPLICATION_PERCENTAGE,
      )
      .map((provider) => provider.provider);

    const checkPassed = providersExceedingMaxDuplicationPercentage.length === 0;

    await this.prismaService.client_report_check_result.create({
      data: {
        client_report_id: reportId,
        check:
          ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_EXCEED_MAX_DUPLICATION,
        result: checkPassed,
        metadata: {
          violating_ids: providersExceedingMaxDuplicationPercentage,
          max_duplication_percentage:
            this.CLIENT_REPORT_MAX_DUPLICATION_PERCENTAGE,
          max_providers_exceeding_max_duplication: 0,
          providers_exceeding_max_duplication:
            providersExceedingMaxDuplicationPercentage.length,
          msg: checkPassed
            ? `Storage provider duplication looks healthy`
            : `${providersExceedingMaxDuplicationPercentage.length} storage providers sealed too much duplicate data`,
        },
      },
    });
  }

  private async storeProvidersWithUnknownLocation(reportId: bigint) {
    const providerDistributionWithLocation =
      await this.prismaService.client_report_storage_provider_distribution.findMany(
        {
          where: {
            client_report_id: reportId,
          },
          include: {
            location: true,
          },
        },
      );

    const providersWithUnknownLocation = providerDistributionWithLocation
      .filter((provider) => !provider.location?.country)
      .map((provider) => provider.provider);

    const checkPassed = providersWithUnknownLocation.length === 0;

    await this.prismaService.client_report_check_result.create({
      data: {
        client_report_id: reportId,
        check:
          ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_UNKNOWN_LOCATION,
        result: checkPassed,
        metadata: {
          violating_ids: providersWithUnknownLocation,
          providers_with_unknown_location: providersWithUnknownLocation.length,
          max_providers_with_unknown_location: 0,
          msg: checkPassed
            ? `Storage provider locations looks healthy`
            : `${providersWithUnknownLocation.length} storage providers have unknown IP location`,
        },
      },
    });
  }

  private async storeProvidersInSameLocation(reportId: bigint) {
    const providerDistributionWithLocation =
      await this.prismaService.client_report_storage_provider_distribution.findMany(
        {
          where: {
            client_report_id: reportId,
          },
          include: {
            location: true,
          },
        },
      );

    const locationSet = new Set(
      providerDistributionWithLocation.map(
        (p) =>
          `${p?.location?.country} ${p?.location?.region} ${p?.location?.city}`,
      ),
    );

    const checkPassed = locationSet.size > 1;

    await this.prismaService.client_report_check_result.create({
      data: {
        client_report_id: reportId,
        check:
          ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_ALL_LOCATED_IN_THE_SAME_REGION,
        result: checkPassed,
        metadata: {
          msg: checkPassed
            ? `Storage providers are located in different regions`
            : `All storage providers are located in the same region`,
        },
      },
    });
  }

  private async storeProvidersIPNIMisreporting(reportId: bigint) {
    const providerDistribution =
      await this.prismaService.client_report_storage_provider_distribution.findMany(
        {
          where: {
            client_report_id: reportId,
          },
        },
      );

    const misreportingProviders = providerDistribution.filter(
      (p) =>
        p.ipni_reporting_status ===
        StorageProviderIpniReportingStatus.MISREPORTING,
    );

    const checkPassed = misreportingProviders.length === 0;

    const percentage =
      providerDistribution.length === 0
        ? 0
        : (misreportingProviders.length / providerDistribution.length) * 100;

    await this.prismaService.client_report_check_result.create({
      data: {
        client_report_id: reportId,
        check:
          ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_IPNI_MISREPORTING,
        result: checkPassed,
        metadata: {
          percentage: percentage,
          violating_ids: misreportingProviders.map((p) => p.provider),
          misreporting_providers: misreportingProviders.length,
          max_misreporting_providers: 0,
          msg: checkPassed
            ? `Storage providers IPNI reporting looks healthy (1/2)`
            : `${percentage.toFixed(2)}% of storage providers have misreported their data to IPNI`,
        },
      },
    });
  }

  private async storeProvidersIPNINotReporting(reportId: bigint) {
    const providerDistribution =
      await this.prismaService.client_report_storage_provider_distribution.findMany(
        {
          where: {
            client_report_id: reportId,
          },
        },
      );

    const notReportingProviders = providerDistribution.filter(
      (p) =>
        p.ipni_reporting_status ===
        StorageProviderIpniReportingStatus.NOT_REPORTING,
    );

    const checkPassed = notReportingProviders.length === 0;

    const percentage =
      providerDistribution.length === 0
        ? 0
        : (notReportingProviders.length / providerDistribution.length) * 100;

    await this.prismaService.client_report_check_result.create({
      data: {
        client_report_id: reportId,
        check:
          ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_IPNI_NOT_REPORTING,
        result: checkPassed,
        metadata: {
          percentage: percentage,
          violating_ids: notReportingProviders.map((p) => p.provider),
          not_reporting_providers: notReportingProviders.length,
          max_not_reporting_providers: 0,
          msg: checkPassed
            ? `Storage providers IPNI reporting looks healthy (2/2)`
            : `${percentage.toFixed(2)}% of storage providers have not reported their data to IPNI`,
        },
      },
    });
  }

  private async storeProvidersRetrievability(reportId: bigint) {
    const providerDistribution =
      await this.prismaService.client_report_storage_provider_distribution.findMany(
        {
          where: {
            client_report_id: reportId,
          },
        },
      );

    const retrievabilitySuccessRates = providerDistribution.map(
      (provider) => provider.retrievability_success_rate_http ?? 0,
    );

    {
      const zeroRetrievabilityCount = retrievabilitySuccessRates.filter(
        (p) => p === 0,
      ).length;

      const checkPassed = zeroRetrievabilityCount === 0;

      const percentage =
        retrievabilitySuccessRates.length === 0
          ? 0
          : (zeroRetrievabilityCount / retrievabilitySuccessRates.length) * 100;

      await this.prismaService.client_report_check_result.create({
        data: {
          client_report_id: reportId,
          check:
            ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_RETRIEVABILITY_ZERO,
          result: checkPassed,
          metadata: {
            percentage: percentage,
            zero_retrievability_providers: zeroRetrievabilityCount,
            max_zero_retrievability_providers: 0,
            msg: checkPassed
              ? `Storage provider zero retrievability looks healthy`
              : `${percentage.toFixed(2)}% of storage providers have retrieval success rate equal to zero`,
          },
        },
      });
    }

    {
      const lessThan75RetrievabilityCount = retrievabilitySuccessRates.filter(
        (p) => p < 0.75,
      ).length;

      const checkPassed = lessThan75RetrievabilityCount === 0;

      const percentage =
        retrievabilitySuccessRates.length === 0
          ? 0
          : (lessThan75RetrievabilityCount /
              retrievabilitySuccessRates.length) *
            100;

      await this.prismaService.client_report_check_result.create({
        data: {
          client_report_id: reportId,
          check:
            ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_RETRIEVABILITY_75,
          result: checkPassed,
          metadata: {
            percentage: percentage,
            less_than_75_retrievability_providers:
              lessThan75RetrievabilityCount,
            max_less_than_75_retrievability_providers: 0,
            msg: checkPassed
              ? 'Storage provider retrievability looks healthy'
              : `${percentage.toFixed(2)}% of storage providers have retrieval success rate less than 75%`,
          },
        },
      });
    }
  }

  private async storeMultipleAllocators(reportId: bigint) {
    const report = await this.prismaService.client_report.findFirst({
      where: {
        id: reportId,
      },
    });

    // ignore Glif Auto Verified allocator for this check
    const allocators = report.allocators.filter(
      (allocator) => allocator !== GlifAutoVerifiedAllocatorId,
    );

    const checkPassed = allocators.length <= 1;

    await this.prismaService.client_report_check_result.create({
      data: {
        client_report_id: reportId,
        check: ClientReportCheck.MULTIPLE_ALLOCATORS,
        result: checkPassed,
        metadata: {
          allocators_count: allocators.length,
          max_allocators_count: 1,
          msg: checkPassed
            ? 'Client receiving datacap from one allocator'
            : 'Client receiving datacap from more than one allocator',
        },
      },
    });
  }

  private async storeDealDataNotEnoughCopies(reportId: bigint) {
    if (envNotSet(this.CLIENT_REPORT_MAX_PERCENTAGE_FOR_REQUIRED_COPIES)) {
      this.logger.warn(
        `CLIENT_REPORT_MAX_PERCENTAGE_FOR_REQUIRED_COPIES env is not set; skipping check`,
      );

      return;
    }

    const replicaDistribution =
      await this.prismaService.client_report_replica_distribution.findMany({
        where: {
          client_report_id: reportId,
        },
      });

    const requiredCopiesCount = (
      await this.prismaService.client_report.findFirst({
        where: {
          id: reportId,
        },
        select: {
          allocator_required_copies: true,
        },
      })
    ).allocator_required_copies;

    if (!requiredCopiesCount) {
      await this.prismaService.client_report_check_result.create({
        data: {
          client_report_id: reportId,
          check: ClientReportCheck.NOT_ENOUGH_COPIES,
          result: true,
          metadata: {
            msg: `Allocator did not define required replicas`,
          },
        },
      });
    } else {
      const notEnoughCopiesPercentage = replicaDistribution
        .filter(
          (distribution) =>
            distribution.num_of_replicas < parseInt(requiredCopiesCount),
        )
        .reduce(
          (totalPercentage, distribution) =>
            totalPercentage + distribution.percentage,
          0,
        );

      await this.prismaService.client_report_check_result.create({
        data: {
          client_report_id: reportId,
          check: ClientReportCheck.NOT_ENOUGH_COPIES,
          result:
            notEnoughCopiesPercentage <=
            this.CLIENT_REPORT_MAX_PERCENTAGE_FOR_REQUIRED_COPIES,
          metadata: {
            percentage: round(notEnoughCopiesPercentage, 2),
            max_percentage_for_required_copies:
              this.CLIENT_REPORT_MAX_PERCENTAGE_FOR_REQUIRED_COPIES,
            msg: `${notEnoughCopiesPercentage.toFixed(2)}% of deals have less than allocator-defined ${requiredCopiesCount} replicas`,
          },
        },
      });
    }
  }

  private async storeDealDataLowReplica(reportId: bigint) {
    if (envNotSet(this.CLIENT_REPORT_MAX_LOW_REPLICA_THRESHOLD)) {
      this.logger.warn(
        `CLIENT_REPORT_MAX_LOW_REPLICA_THRESHOLD env is not set; skipping check`,
      );

      return;
    }

    if (envNotSet(this.CLIENT_REPORT_MAX_PERCENTAGE_FOR_LOW_REPLICA)) {
      this.logger.warn(
        `CLIENT_REPORT_MAX_PERCENTAGE_FOR_LOW_REPLICA env is not set; skipping check`,
      );

      return;
    }

    const replicaDistribution =
      await this.prismaService.client_report_replica_distribution.findMany({
        where: {
          client_report_id: reportId,
        },
      });

    const lowReplicaPercentage = replicaDistribution
      .filter(
        (distribution) =>
          distribution.num_of_replicas <=
          this.CLIENT_REPORT_MAX_LOW_REPLICA_THRESHOLD,
      )
      .map((distribution) => distribution.percentage)
      .reduce((a, b) => a + b, 0);

    await this.prismaService.client_report_check_result.create({
      data: {
        client_report_id: reportId,
        check: ClientReportCheck.DEAL_DATA_REPLICATION_LOW_REPLICA,
        result:
          lowReplicaPercentage <=
          this.CLIENT_REPORT_MAX_PERCENTAGE_FOR_LOW_REPLICA,
        metadata: {
          percentage: round(lowReplicaPercentage, 2),
          max_percentage_for_low_replica:
            this.CLIENT_REPORT_MAX_PERCENTAGE_FOR_LOW_REPLICA,
          msg: `Low replica percentage is ${lowReplicaPercentage.toFixed(2)}%`,
        },
      },
    });
  }

  private async storeDealDataSharedWithOtherClientsCidSharing(
    reportId: bigint,
  ) {
    const cidSharingCount =
      await this.prismaService.client_report_cid_sharing.count({
        where: {
          client_report_id: reportId,
        },
      });

    const checkPassed = cidSharingCount === 0;

    await this.prismaService.client_report_check_result.create({
      data: {
        client_report_id: reportId,
        check: ClientReportCheck.DEAL_DATA_REPLICATION_CID_SHARING,
        result: checkPassed,
        metadata: {
          count: cidSharingCount,
          msg: checkPassed
            ? 'No CID sharing has been observed'
            : 'CID sharing has been observed',
        },
      },
    });
  }
}
