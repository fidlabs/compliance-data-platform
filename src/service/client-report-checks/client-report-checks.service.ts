import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/db/prisma.service';
import { ClientReportCheck } from 'prisma/generated/client';
import { round } from 'lodash';
import { StorageProviderIpniReportingStatus } from 'prisma/generated/client';
import { GlifAutoVerifiedAllocatorId } from 'src/utils/constants';

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
    if (this.envNotSet(this.CLIENT_REPORT_MAX_PROVIDER_DEAL_PERCENTAGE)) {
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

    const providersExceedingProviderDeal = [];

    for (const provider of providerDistribution) {
      const providerDistributionPercentage =
        Number((provider.total_deal_size * 10000n) / total) / 100;

      if (
        providerDistributionPercentage >
        this.CLIENT_REPORT_MAX_PROVIDER_DEAL_PERCENTAGE
      ) {
        providersExceedingProviderDeal.push(provider.provider);
      }
    }

    if (providersExceedingProviderDeal.length > 0) {
      await this.prismaService.client_report_check_result.create({
        data: {
          client_report_id: reportId,
          check:
            ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_EXCEED_PROVIDER_DEAL,
          result: false,
          metadata: {
            violating_ids: providersExceedingProviderDeal,
            max_provider_deal_percentage:
              this.CLIENT_REPORT_MAX_PROVIDER_DEAL_PERCENTAGE,
            max_providers_exceeding_provider_deal: 0,
            providers_exceeding_provider_deal:
              providersExceedingProviderDeal.length,
            msg: `${providersExceedingProviderDeal.length} storage providers sealed more than ${this.CLIENT_REPORT_MAX_PROVIDER_DEAL_PERCENTAGE}% of total datacap`,
          },
        },
      });
    } else {
      await this.prismaService.client_report_check_result.create({
        data: {
          client_report_id: reportId,
          check:
            ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_EXCEED_PROVIDER_DEAL,
          result: true,
          metadata: {
            msg: `Storage provider distribution looks healthy`,
          },
        },
      });
    }
  }

  private async storeProvidersExceedingMaxDuplicationPercentage(
    reportId: bigint,
  ) {
    if (this.envNotSet(this.CLIENT_REPORT_MAX_DUPLICATION_PERCENTAGE)) {
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

    const providersExceedingMaxDuplicationPercentage = [];

    for (const provider of providerDistribution) {
      if (
        ((provider.total_deal_size - provider.unique_data_size) * 10000n) /
          provider.total_deal_size /
          100n >
        this.CLIENT_REPORT_MAX_DUPLICATION_PERCENTAGE
      ) {
        providersExceedingMaxDuplicationPercentage.push(provider.provider);
      }
    }

    if (providersExceedingMaxDuplicationPercentage.length > 0) {
      await this.prismaService.client_report_check_result.create({
        data: {
          client_report_id: reportId,
          check:
            ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_EXCEED_MAX_DUPLICATION,
          result: false,
          metadata: {
            violating_ids: providersExceedingMaxDuplicationPercentage,
            max_duplication_percentage:
              this.CLIENT_REPORT_MAX_DUPLICATION_PERCENTAGE,
            max_providers_exceeding_max_duplication: 0,
            providers_exceeding_max_duplication:
              providersExceedingMaxDuplicationPercentage.length,
            msg: `${providersExceedingMaxDuplicationPercentage.length} storage providers sealed too much duplicate data`,
          },
        },
      });
    } else {
      await this.prismaService.client_report_check_result.create({
        data: {
          client_report_id: reportId,
          check:
            ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_EXCEED_MAX_DUPLICATION,
          result: true,
          metadata: {
            msg: `Storage provider duplication looks healthy`,
          },
        },
      });
    }
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

    const providersWithUnknownLocation = [];

    for (const provider of providerDistributionWithLocation) {
      if (!provider.location?.country) {
        providersWithUnknownLocation.push(provider.provider);
      }
    }

    if (providersWithUnknownLocation.length > 0) {
      await this.prismaService.client_report_check_result.create({
        data: {
          client_report_id: reportId,
          check:
            ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_UNKNOWN_LOCATION,
          result: false,
          metadata: {
            violating_ids: providersWithUnknownLocation,
            providers_with_unknown_location:
              providersWithUnknownLocation.length,
            max_providers_with_unknown_location: 0,
            msg: `${providersWithUnknownLocation.length} storage providers have unknown IP location`,
          },
        },
      });
    } else {
      await this.prismaService.client_report_check_result.create({
        data: {
          client_report_id: reportId,
          check:
            ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_UNKNOWN_LOCATION,
          result: true,
          metadata: {
            msg: `Storage provider locations looks healthy`,
          },
        },
      });
    }
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

    if (locationSet.size <= 1) {
      await this.prismaService.client_report_check_result.create({
        data: {
          client_report_id: reportId,
          check:
            ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_ALL_LOCATED_IN_THE_SAME_REGION,
          result: false,
          metadata: {
            msg: `All storage providers are located in the same region`,
          },
        },
      });
    } else {
      await this.prismaService.client_report_check_result.create({
        data: {
          client_report_id: reportId,
          check:
            ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_ALL_LOCATED_IN_THE_SAME_REGION,
          result: true,
          metadata: {
            msg: `Storage providers are located in different regions`,
          },
        },
      });
    }
  }

  private async storeProvidersIPNIMisreporting(reportId: bigint) {
    const providerDistribution: any[] =
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

    if (misreportingProviders.length > 0) {
      const percentage =
        (misreportingProviders.length / providerDistribution.length) * 100;

      await this.prismaService.client_report_check_result.create({
        data: {
          client_report_id: reportId,
          check:
            ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_IPNI_MISREPORTING,
          result: false,
          metadata: {
            percentage: percentage,
            violating_ids: misreportingProviders.map((p) => p.provider),
            misreporting_providers: misreportingProviders.length,
            max_misreporting_providers: 0,
            msg: `${percentage.toFixed(2)}% of storage providers have misreported their data to IPNI`,
          },
        },
      });
    } else {
      await this.prismaService.client_report_check_result.create({
        data: {
          client_report_id: reportId,
          check:
            ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_IPNI_MISREPORTING,
          result: true,
          metadata: {
            msg: `Storage providers IPNI reporting looks healthy (1/2)`,
          },
        },
      });
    }
  }

  private async storeProvidersIPNINotReporting(reportId: bigint) {
    const providerDistribution: any[] =
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

    if (notReportingProviders.length > 0) {
      const percentage =
        (notReportingProviders.length / providerDistribution.length) * 100;

      await this.prismaService.client_report_check_result.create({
        data: {
          client_report_id: reportId,
          check:
            ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_IPNI_NOT_REPORTING,
          result: false,
          metadata: {
            percentage: percentage,
            violating_ids: notReportingProviders.map((p) => p.provider),
            not_reporting_providers: notReportingProviders.length,
            max_not_reporting_providers: 0,
            msg: `${percentage.toFixed(2)}% of storage providers have not reported their data to IPNI`,
          },
        },
      });
    } else {
      await this.prismaService.client_report_check_result.create({
        data: {
          client_report_id: reportId,
          check:
            ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_IPNI_NOT_REPORTING,
          result: true,
          metadata: {
            msg: `Storage providers IPNI reporting looks healthy (2/2)`,
          },
        },
      });
    }
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

    const zeroRetrievabilityCount = retrievabilitySuccessRates.filter(
      (p) => p === 0,
    ).length;

    if (zeroRetrievabilityCount > 0) {
      const percentage =
        (zeroRetrievabilityCount / retrievabilitySuccessRates.length) * 100;

      await this.prismaService.client_report_check_result.create({
        data: {
          client_report_id: reportId,
          check:
            ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_RETRIEVABILITY_ZERO,
          result: false,
          metadata: {
            percentage: percentage,
            zero_retrievability_providers: zeroRetrievabilityCount,
            max_zero_retrievability_providers: 0,
            msg: `${percentage.toFixed(2)}% of storage providers have retrieval success rate equal to zero`,
          },
        },
      });
    } else {
      await this.prismaService.client_report_check_result.create({
        data: {
          client_report_id: reportId,
          check:
            ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_RETRIEVABILITY_ZERO,
          result: true,
          metadata: {
            msg: `Storage provider zero retrievability looks healthy`,
          },
        },
      });
    }

    const lessThan75RetrievabilityCount = retrievabilitySuccessRates.filter(
      (p) => p < 0.75,
    ).length;

    if (lessThan75RetrievabilityCount > 0) {
      const percentage =
        (lessThan75RetrievabilityCount / retrievabilitySuccessRates.length) *
        100;

      await this.prismaService.client_report_check_result.create({
        data: {
          client_report_id: reportId,
          check:
            ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_RETRIEVABILITY_75,
          result: false,
          metadata: {
            percentage: percentage,
            less_than_75_retrievability_providers:
              lessThan75RetrievabilityCount,
            max_less_than_75_retrievability_providers: 0,
            msg: `${percentage.toFixed(2)}% of storage providers have retrieval success rate less than 75%`,
          },
        },
      });
    } else {
      await this.prismaService.client_report_check_result.create({
        data: {
          client_report_id: reportId,
          check:
            ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_RETRIEVABILITY_75,
          result: true,
          metadata: {
            msg: `Storage provider retrievability looks healthy`,
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

    await this.prismaService.client_report_check_result.create({
      data: {
        client_report_id: reportId,
        check: ClientReportCheck.MULTIPLE_ALLOCATORS,
        result: allocators.length <= 1,
        metadata: {
          allocators_count: allocators.length,
          max_allocators_count: 1,
          msg:
            allocators.length <= 1
              ? 'Client receiving datacap from one allocator'
              : 'Client receiving datacap from more than one allocator',
        },
      },
    });
  }

  private async storeDealDataNotEnoughCopies(reportId: bigint) {
    if (this.envNotSet(this.CLIENT_REPORT_MAX_PERCENTAGE_FOR_REQUIRED_COPIES)) {
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
      // prettier-ignore
      const notEnoughCopiesPercentage =
        replicaDistribution.filter(
          (distribution) =>
            distribution.num_of_replicas < parseInt(requiredCopiesCount),
        ).reduce((totalPercentage, distribution) => totalPercentage + distribution.percentage, 0);

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
    if (this.envNotSet(this.CLIENT_REPORT_MAX_LOW_REPLICA_THRESHOLD)) {
      this.logger.warn(
        `CLIENT_REPORT_MAX_LOW_REPLICA_THRESHOLD env is not set; skipping check`,
      );

      return;
    }

    if (this.envNotSet(this.CLIENT_REPORT_MAX_PERCENTAGE_FOR_LOW_REPLICA)) {
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

    await this.prismaService.client_report_check_result.create({
      data: {
        client_report_id: reportId,
        check: ClientReportCheck.DEAL_DATA_REPLICATION_CID_SHARING,
        result: cidSharingCount === 0,
        metadata: {
          count: cidSharingCount,
          msg:
            cidSharingCount === 0
              ? 'No CID sharing has been observed'
              : 'CID sharing has been observed',
        },
      },
    });
  }

  private envNotSet(value?: any) {
    return (
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '')
    );
  }
}
