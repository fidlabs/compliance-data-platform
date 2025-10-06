import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DateTime } from 'luxon';
import {
  ClientReportCheck,
  StorageProviderIpniReportingStatus,
} from 'prisma/generated/client';
import { PrismaService } from 'src/db/prisma.service';
import { GlifAutoVerifiedAllocatorId } from 'src/utils/constants';
import { bigIntDiv, envNotSet, stringToNumber } from 'src/utils/utils';

@Injectable()
export class ClientReportChecksService {
  public CLIENT_REPORT_MAX_PROVIDER_DEAL_PERCENTAGE: number;
  public CLIENT_REPORT_MAX_DUPLICATION_PERCENTAGE: number;
  public CLIENT_REPORT_MAX_PERCENTAGE_FOR_LOW_REPLICA: number;
  public CLIENT_REPORT_MAX_PERCENTAGE_FOR_HIGH_REPLICA: number;
  public CLIENT_REPORT_MAX_PERCENTAGE_FOR_REQUIRED_COPIES: number;
  public CLIENT_REPORT_MAX_PERCENTAGE_NOT_DECLARED_PROVIDERS: number;
  public CLIENT_REPORT_TOTAL_UNIQ_DATA_SET_SIZE_ALLOW_EXCEEDS_PERCENTAGE: number;

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
    this.CLIENT_REPORT_MAX_PERCENTAGE_FOR_HIGH_REPLICA = configService.get<number>(
      'CLIENT_REPORT_MAX_PERCENTAGE_FOR_HIGH_REPLICA',
    );
    this.CLIENT_REPORT_MAX_PERCENTAGE_FOR_REQUIRED_COPIES = configService.get<number>(
      'CLIENT_REPORT_MAX_PERCENTAGE_FOR_REQUIRED_COPIES',
    );
    this.CLIENT_REPORT_MAX_PERCENTAGE_NOT_DECLARED_PROVIDERS = configService.get<number>(
      'CLIENT_REPORT_MAX_PERCENTAGE_NOT_DECLARED_PROVIDERS',
    );
    this.CLIENT_REPORT_TOTAL_UNIQ_DATA_SET_SIZE_ALLOW_EXCEEDS_PERCENTAGE = configService.get<number>(
      'CLIENT_REPORT_TOTAL_UNIQ_DATA_SET_SIZE_ALLOW_EXCEEDS_PERCENTAGE',
    );
  }

  public async storeReportChecks(reportId: bigint) {
    await this.storeMultipleAllocators(reportId);
    await this.storeInactivity(reportId);
    await this.storeStorageProviderDistributionChecks(reportId);
    await this.storeDealDataReplicationChecks(reportId);
    await this.storeDealDataSharedWithOtherClientsChecks(reportId);
    await this.storeUniqueDataSetSizeChecks(reportId);
  }

  private async storeStorageProviderDistributionChecks(reportId: bigint) {
    await this.storeProvidersExceedingProviderDeal(reportId);
    await this.storeProvidersExceedingMaxDuplicationPercentage(reportId);
    await this.storeProvidersWithUnknownLocation(reportId);
    await this.storeProvidersInSameLocation(reportId);
    await this.storeProvidersHttpRetrievability(reportId);
    await this.storeProvidersUrlFinderRetrievability(reportId);
    await this.storeProvidersIPNIMisreporting(reportId);
    await this.storeProvidersIPNINotReporting(reportId);
    await this.storeProvidersDeclaredNotUsed(reportId);
    await this.storeProvidersNotDeclared(reportId);
  }

  private async storeDealDataReplicationChecks(reportId: bigint) {
    await this.storeDealDataLowReplica(reportId);
    await this.storeDealDataHighReplica(reportId);
    await this.storeDealDataNotEnoughCopies(reportId);
  }

  private async storeDealDataSharedWithOtherClientsChecks(reportId: bigint) {
    await this.storeDealDataSharedWithOtherClientsCidSharing(reportId);
  }

  private async storeUniqueDataSetSizeChecks(reportId: bigint) {
    await this.storeUniqueDataSetSize(reportId);
  }

  private async storeInactivity(reportId: bigint) {
    const { available_datacap, last_datacap_spent, last_datacap_received } =
      await this.prismaService.client_report.findUnique({
        select: {
          available_datacap: true,
          last_datacap_spent: true,
          last_datacap_received: true,
        },
        where: {
          id: reportId,
        },
      });

    const inactivityPeriod = DateTime.now().diff(
      DateTime.fromJSDate(last_datacap_spent),
      'days',
    ).days;

    const timeSinceLastDatacap = DateTime.now().diff(
      DateTime.fromJSDate(last_datacap_received),
      'days',
    ).days;

    const checkPassed =
      timeSinceLastDatacap < 60 || !available_datacap || inactivityPeriod < 60;

    await this.prismaService.client_report_check_result.create({
      data: {
        client_report_id: reportId,
        check: ClientReportCheck.INACTIVITY,
        result: checkPassed,
        metadata: {
          inactivity_period_days: inactivityPeriod.toFixed(2),
          available_datacap: available_datacap?.toString() ?? null,
          time_since_last_datacap_days: timeSinceLastDatacap.toFixed(2),
          msg: checkPassed
            ? `Client was active in last 60 days or spent all its DataCap`
            : `Client has unspent DataCap and was inactive for more than a 2 months`,
        },
      },
    });
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

    const totalDealSize = providerDistribution.reduce(
      (a, c) => a + c.total_deal_size,
      0n,
    );

    const providersExceedingProviderDeal =
      totalDealSize === 0n
        ? []
        : providerDistribution
            .filter(
              (provider) =>
                bigIntDiv(provider.total_deal_size * 100n, totalDealSize) >
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
          max_providers_exceeding_provider_deal: 0,
          msg: checkPassed
            ? `Storage provider distribution looks healthy`
            : `${this._storageProviders(providersExceedingProviderDeal.length)} sealed more than ${this.CLIENT_REPORT_MAX_PROVIDER_DEAL_PERCENTAGE}% of total datacap`,
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

    const providersExceedingMaxDuplication = providerDistribution
      .filter(
        (provider) =>
          provider.total_deal_size &&
          bigIntDiv(
            (provider.total_deal_size - provider.unique_data_size) * 100n,
            provider.total_deal_size,
          ) > this.CLIENT_REPORT_MAX_DUPLICATION_PERCENTAGE,
      )
      .map((provider) => provider.provider);

    const checkPassed = providersExceedingMaxDuplication.length === 0;

    await this.prismaService.client_report_check_result.create({
      data: {
        client_report_id: reportId,
        check:
          ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_EXCEED_MAX_DUPLICATION,
        result: checkPassed,
        metadata: {
          violating_ids: providersExceedingMaxDuplication,
          max_duplication_percentage:
            this.CLIENT_REPORT_MAX_DUPLICATION_PERCENTAGE,
          max_providers_exceeding_max_duplication: 0,
          msg: checkPassed
            ? `Storage provider duplication looks healthy`
            : `${this._storageProviders(providersExceedingMaxDuplication.length)} sealed too much duplicate data`,
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
          max_providers_with_unknown_location: 0,
          msg: checkPassed
            ? `Storage provider locations looks healthy`
            : `${this._storageProviders(providersWithUnknownLocation.length)} have unknown IP location`,
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

    const misreportingProviders = providerDistribution
      .filter(
        (p) =>
          p.ipni_reporting_status ===
          StorageProviderIpniReportingStatus.MISREPORTING,
      )
      .map((p) => p.provider);

    const checkPassed = misreportingProviders.length === 0;

    await this.prismaService.client_report_check_result.create({
      data: {
        client_report_id: reportId,
        check:
          ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_IPNI_MISREPORTING,
        result: checkPassed,
        metadata: {
          violating_ids: misreportingProviders,
          max_misreporting_providers: 0,
          msg: checkPassed
            ? `Storage providers IPNI reporting looks healthy (1/2)`
            : `${this._storageProviders(misreportingProviders.length)} have misreported their data to IPNI`,
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

    const notReportingProviders = providerDistribution
      .filter(
        (p) =>
          p.ipni_reporting_status ===
          StorageProviderIpniReportingStatus.NOT_REPORTING,
      )
      .map((p) => p.provider);

    const checkPassed = notReportingProviders.length === 0;

    await this.prismaService.client_report_check_result.create({
      data: {
        client_report_id: reportId,
        check:
          ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_IPNI_NOT_REPORTING,
        result: checkPassed,
        metadata: {
          violating_ids: notReportingProviders,
          max_not_reporting_providers: 0,
          msg: checkPassed
            ? `Storage providers IPNI reporting looks healthy (2/2)`
            : `${this._storageProviders(notReportingProviders.length)} have not reported their data to IPNI`,
        },
      },
    });
  }

  private async storeProvidersHttpRetrievability(reportId: bigint) {
    const providerDistribution =
      await this.prismaService.client_report_storage_provider_distribution.findMany(
        {
          where: {
            client_report_id: reportId,
          },
        },
      );

    {
      const zeroHttpRetrievabilityProviders = providerDistribution
        .filter((p) => !p.retrievability_success_rate_http)
        .map((p) => p.provider);

      const httpCheckPassed = zeroHttpRetrievabilityProviders.length === 0;

      await this.prismaService.client_report_check_result.create({
        data: {
          client_report_id: reportId,
          check:
            ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_RETRIEVABILITY_ZERO,
          result: httpCheckPassed,
          metadata: {
            violating_ids: zeroHttpRetrievabilityProviders,
            max_zero_retrievability_providers: 0,
            msg: httpCheckPassed
              ? `Storage provider HTTP retrievability looks healthy (1/2)`
              : `${this._storageProviders(zeroHttpRetrievabilityProviders.length)} have HTTP retrieval success rate equal to zero`,
          },
        },
      });
    }

    {
      const lessThan75HttpRetrievabilityProviders = providerDistribution
        .filter((p) => (p.retrievability_success_rate_http ?? 0) < 0.75)
        .map((p) => p.provider);

      const httpCheckPassed =
        lessThan75HttpRetrievabilityProviders.length === 0;

      await this.prismaService.client_report_check_result.create({
        data: {
          client_report_id: reportId,
          check:
            ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_RETRIEVABILITY_75,
          result: httpCheckPassed,
          metadata: {
            violating_ids: lessThan75HttpRetrievabilityProviders,
            max_less_than_75_retrievability_providers: 0,
            msg: httpCheckPassed
              ? `Storage provider HTTP retrievability looks healthy (2/2)`
              : `${this._storageProviders(lessThan75HttpRetrievabilityProviders.length)} have HTTP retrieval success rate less than 75%`,
          },
        },
      });
    }
  }

  private async storeProvidersUrlFinderRetrievability(reportId: bigint) {
    const providerDistribution =
      await this.prismaService.client_report_storage_provider_distribution.findMany(
        {
          where: {
            client_report_id: reportId,
          },
        },
      );

    {
      const zeroUrlFinderRetrievabilityProviders = providerDistribution
        .filter((p) => !p.retrievability_success_rate_url_finder)
        .map((p) => p.provider);

      const urlFinderCheckPassed =
        zeroUrlFinderRetrievabilityProviders.length === 0;

      await this.prismaService.client_report_check_result.create({
        data: {
          client_report_id: reportId,
          check:
            ClientReportCheck.STORAGE_PROVIDER_URL_FINDER_RETRIEVABILITY_ZERO,
          result: urlFinderCheckPassed,
          metadata: {
            violating_ids: zeroUrlFinderRetrievabilityProviders,
            max_zero_retrievability_providers: 0,
            msg: urlFinderCheckPassed
              ? `Storage provider RPA retrievability looks healthy (1/2)`
              : `${this._storageProviders(zeroUrlFinderRetrievabilityProviders.length)} have RPA retrieval success rate equal to zero`,
          },
        },
      });
    }

    {
      const lessThan75UrlFinderRetrievabilityProviders = providerDistribution
        .filter((p) => (p.retrievability_success_rate_url_finder ?? 0) < 0.75)
        .map((p) => p.provider);

      const urlFinderCheckPassed =
        lessThan75UrlFinderRetrievabilityProviders.length === 0;

      await this.prismaService.client_report_check_result.create({
        data: {
          client_report_id: reportId,
          check:
            ClientReportCheck.STORAGE_PROVIDER_URL_FINDER_RETRIEVABILITY_75,
          result: urlFinderCheckPassed,
          metadata: {
            violating_ids: lessThan75UrlFinderRetrievabilityProviders,
            max_less_than_75_retrievability_providers: 0,
            msg: urlFinderCheckPassed
              ? `Storage provider RPA retrievability looks healthy (2/2)`
              : `${this._storageProviders(lessThan75UrlFinderRetrievabilityProviders.length)} have RPA retrieval success rate less than 75%`,
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

  private async storeProvidersDeclaredNotUsed(reportId: bigint) {
    const report = await this.prismaService.client_report.findFirst({
      where: {
        id: reportId,
      },
      select: {
        storage_provider_ids_declared: true,
        storage_provider_distribution: {
          select: {
            provider: true,
          },
        },
      },
    });

    const actualStorageProviders = report.storage_provider_distribution.map(
      (provider) => provider.provider,
    );

    const declaredNotUsedProviders =
      report.storage_provider_ids_declared.filter(
        (provider) => !actualStorageProviders.includes(provider),
      );

    const checkPassed = declaredNotUsedProviders.length === 0;

    await this.prismaService.client_report_check_result.create({
      data: {
        client_report_id: reportId,
        check:
          ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_DECLARED_NOT_USED,
        result: checkPassed,
        metadata: {
          max_declared_not_used_providers: 0,
          violating_ids: declaredNotUsedProviders,
          msg: checkPassed
            ? 'All declared storage providers match actual providers'
            : `${this._storageProvidersAre(declaredNotUsedProviders.length)} declared in application file but not actually used`,
        },
      },
    });
  }

  private async storeProvidersNotDeclared(reportId: bigint) {
    if (envNotSet(this.CLIENT_REPORT_MAX_PERCENTAGE_NOT_DECLARED_PROVIDERS)) {
      this.logger.warn(
        `CLIENT_REPORT_MAX_PERCENTAGE_NOT_DECLARED_PROVIDERS env is not set; skipping check`,
      );

      return;
    }

    const report = await this.prismaService.client_report.findFirst({
      where: {
        id: reportId,
      },
      select: {
        storage_provider_ids_declared: true,
        storage_provider_distribution: {
          select: {
            provider: true,
          },
        },
      },
    });

    const actualStorageProviders = report.storage_provider_distribution.map(
      (provider) => provider.provider,
    );

    const notDeclaredProviders = actualStorageProviders.filter(
      (provider) => !report.storage_provider_ids_declared.includes(provider),
    );

    const percentageOfNotDeclaredProviders =
      actualStorageProviders.length === 0
        ? 0
        : (notDeclaredProviders.length / actualStorageProviders.length) * 100;

    const checkPassed =
      percentageOfNotDeclaredProviders <=
      this.CLIENT_REPORT_MAX_PERCENTAGE_NOT_DECLARED_PROVIDERS;

    await this.prismaService.client_report_check_result.create({
      data: {
        client_report_id: reportId,
        check:
          ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_NOT_DECLARED,
        result: checkPassed,
        metadata: {
          max_percentage_of_not_declared_providers:
            this.CLIENT_REPORT_MAX_PERCENTAGE_NOT_DECLARED_PROVIDERS,
          percentage_of_not_declared_providers: `${percentageOfNotDeclaredProviders.toFixed(2)}`,
          violating_ids: notDeclaredProviders,
          msg:
            notDeclaredProviders.length === 0
              ? 'All actual storage providers are declared in application file'
              : `${this._storageProvidersAre(notDeclaredProviders.length)} not declared in application file`,
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
      const percentageSumOfNotEnoughCopiesDeals = replicaDistribution
        .filter(
          (distribution) =>
            distribution.num_of_replicas < stringToNumber(requiredCopiesCount),
        )
        .reduce(
          (totalPercentage, distribution) =>
            totalPercentage + distribution.percentage,
          0,
        );

      const checkPassed =
        percentageSumOfNotEnoughCopiesDeals <=
        this.CLIENT_REPORT_MAX_PERCENTAGE_FOR_REQUIRED_COPIES;

      await this.prismaService.client_report_check_result.create({
        data: {
          client_report_id: reportId,
          check: ClientReportCheck.NOT_ENOUGH_COPIES,
          result: checkPassed,
          metadata: {
            max_percentage_for_required_copies:
              this.CLIENT_REPORT_MAX_PERCENTAGE_FOR_REQUIRED_COPIES,
            msg: `${percentageSumOfNotEnoughCopiesDeals.toFixed(2)}% of data have less than allocator-defined ${requiredCopiesCount}+ replicas`,
          },
        },
      });
    }
  }

  private async storeDealDataLowReplica(reportId: bigint) {
    if (envNotSet(this.CLIENT_REPORT_MAX_PERCENTAGE_FOR_LOW_REPLICA)) {
      this.logger.warn(
        `CLIENT_REPORT_MAX_PERCENTAGE_FOR_LOW_REPLICA env is not set; skipping check`,
      );

      return;
    }

    const lowReplicaThreshold = (
      await this.prismaService.client_report.findFirst({
        where: {
          id: reportId,
        },
        select: {
          low_replica_threshold: true,
        },
      })
    ).low_replica_threshold;

    if (lowReplicaThreshold === null) {
      this.logger.warn(
        `Low replica threshold is not set for report ${reportId}; skipping  check`,
      );
      return;
    }

    const percentageSumOfLowReplicaDeals =
      (
        await this.prismaService.client_report_replica_distribution.aggregate({
          _sum: {
            percentage: true,
          },
          where: {
            client_report_id: reportId,
            num_of_replicas: {
              lt: lowReplicaThreshold,
            },
          },
        })
      )._sum.percentage ?? 0;

    const checkPassed =
      percentageSumOfLowReplicaDeals <=
      this.CLIENT_REPORT_MAX_PERCENTAGE_FOR_LOW_REPLICA;

    await this.prismaService.client_report_check_result.create({
      data: {
        client_report_id: reportId,
        check: ClientReportCheck.DEAL_DATA_REPLICATION_LOW_REPLICA,
        result: checkPassed,
        metadata: {
          max_percentage_for_low_replica:
            this.CLIENT_REPORT_MAX_PERCENTAGE_FOR_LOW_REPLICA,
          msg: `Low replica percentage is ${percentageSumOfLowReplicaDeals.toFixed(2)}%`,
        },
      },
    });
  }

  private async storeDealDataHighReplica(reportId: bigint) {
    if (envNotSet(this.CLIENT_REPORT_MAX_PERCENTAGE_FOR_HIGH_REPLICA)) {
      this.logger.warn(
        `CLIENT_REPORT_MAX_PERCENTAGE_FOR_HIGH_REPLICA env is not set; skipping check`,
      );

      return;
    }

    const highReplicaThreshold = (
      await this.prismaService.client_report.findFirst({
        where: {
          id: reportId,
        },
        select: {
          high_replica_threshold: true,
        },
      })
    ).high_replica_threshold;

    if (highReplicaThreshold === null) {
      this.logger.warn(
        `High replica threshold is not set for report ${reportId}; skipping check`,
      );
      return;
    }

    const percentageSumOfHighReplicaDeals =
      (
        await this.prismaService.client_report_replica_distribution.aggregate({
          _sum: {
            percentage: true,
          },
          where: {
            client_report_id: reportId,
            num_of_replicas: {
              gt: highReplicaThreshold,
            },
          },
        })
      )._sum.percentage ?? 0;

    const checkPassed =
      percentageSumOfHighReplicaDeals <=
      this.CLIENT_REPORT_MAX_PERCENTAGE_FOR_HIGH_REPLICA;

    await this.prismaService.client_report_check_result.create({
      data: {
        client_report_id: reportId,
        check: ClientReportCheck.DEAL_DATA_REPLICATION_HIGH_REPLICA,
        result: checkPassed,
        metadata: {
          max_percentage_for_replica:
            this.CLIENT_REPORT_MAX_PERCENTAGE_FOR_HIGH_REPLICA,
          msg: `High replica percentage is ${percentageSumOfHighReplicaDeals.toFixed(2)}%`,
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

  private async storeUniqueDataSetSize(reportId: bigint) {
    // prettier-ignore
    if (envNotSet(this.CLIENT_REPORT_TOTAL_UNIQ_DATA_SET_SIZE_ALLOW_EXCEEDS_PERCENTAGE)) {
      this.logger.warn(
        `CLIENT_REPORT_TOTAL_UNIQ_DATA_SET_SIZE_ALLOW_EXCEEDS_PERCENTAGE env is not set; skipping check`,
      );

      return;
    }

    const report = await this.prismaService.client_report.findFirst({
      where: {
        id: reportId,
      },
    });

    let checkPassed: boolean;
    let checkMessage: string;

    if (!report.expected_size_of_single_dataset) {
      checkPassed = false;
      checkMessage =
        'Single Size Dataset field is not set correctly in the client application JSON';
    } else {
      // prettier-ignore
      const thresholdValue =
        (report.expected_size_of_single_dataset * BigInt(this.CLIENT_REPORT_TOTAL_UNIQ_DATA_SET_SIZE_ALLOW_EXCEEDS_PERCENTAGE)) / 100n;

      checkPassed =
        report.total_uniq_data_set_size <
        report.expected_size_of_single_dataset + thresholdValue;

      checkMessage = checkPassed
        ? 'Unique data set size looks healthy'
        : 'Unique data set size exceeds declared';
    }

    await this.prismaService.client_report_check_result.create({
      data: {
        client_report_id: reportId,
        check: ClientReportCheck.UNIQ_DATA_SET_SIZE_TO_DECLARED,
        result: checkPassed,
        metadata: {
          msg: checkMessage,
        },
      },
    });
  }

  private _storageProviders(n: number): string {
    return n === 0
      ? 'No storage providers'
      : n === 1
        ? '1 storage provider'
        : `${n} storage providers`;
  }

  private _storageProvidersAre(n: number): string {
    return this._storageProviders(n) + ' ' + (n === 1 ? 'is' : 'are');
  }
}
