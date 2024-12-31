import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../db/prisma.service';
import { ClientReportCheck } from 'prisma/generated/client';
import { round } from 'lodash';

@Injectable()
export class ClientReportChecksService {
  _maxProviderDealPercentage: number;
  _maxDuplicationPercentage: number;
  _maxPercentageForLowReplica: number;
  _lowReplicaThreshold: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    this._maxProviderDealPercentage = configService.get<number>(
      'CLIENT_REPORT_MAX_PROVIDER_DEAL_PERCENTAGE',
    );
    this._maxDuplicationPercentage = configService.get<number>(
      'CLIENT_REPORT_MAX_DUPLICATION_PERCENTAGE',
    );
    this._maxPercentageForLowReplica = configService.get<number>(
      'CLIENT_REPORT_MAX_PERCENTAGE_FOR_LOW_REPLICA',
    );
    this._lowReplicaThreshold = configService.get<number>(
      'CLIENT_REPORT_MAX_LOW_REPLICA_THRESHOLD',
    );
  }

  async storeReportChecks(reportId: bigint) {
    await this.storeStorageProviderDistributionChecks(reportId);
    await this.storeDealDataReplicationChecks(reportId);
    await this.storeDealDataSharedWithOtherClientsChecks(reportId);
  }

  private async storeStorageProviderDistributionChecks(reportId: bigint) {
    await this.storeProvidersExceedingProviderDealResults(reportId);
    await this.storeProvidersExceedingMaxDuplicationPercentage(reportId);
    await this.storeProvidersWithUnknownLocation(reportId);
    await this.storeProvidersInSameLocation(reportId);
    await this.storeProvidersRetrievability(reportId);
  }

  private async storeDealDataReplicationChecks(reportId: bigint) {
    await this.storeDealDataLowReplica(reportId);
  }

  private async storeDealDataSharedWithOtherClientsChecks(reportId: bigint) {
    await this.storeDealDataSharedWithOtherClientsCidSharing(reportId);
  }

  private async storeProvidersExceedingProviderDealResults(reportId: bigint) {
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

      if (providerDistributionPercentage > this._maxProviderDealPercentage) {
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
            max_provider_deal_percentage: this._maxProviderDealPercentage,
            max_providers_exceeding_provider_deal: 0,
            providers_exceeding_provider_deal:
              providersExceedingProviderDeal.length,
            msg: `${providersExceedingProviderDeal.length} storage providers sealed more than ${this._maxProviderDealPercentage.toFixed(2)}% of total datacap`,
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
        this._maxDuplicationPercentage
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
            max_duplication_percentage: this._maxDuplicationPercentage,
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
      if (
        provider.location == undefined ||
        provider.location.country === null ||
        provider.location.country === ''
      ) {
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

  private async storeProvidersRetrievability(reportId: bigint) {
    const providerDistribution =
      await this.prismaService.client_report_storage_provider_distribution.findMany(
        {
          where: {
            client_report_id: reportId,
          },
        },
      );

    const retrievabilitySuccessRates = [];
    for (const provider of providerDistribution) {
      const retrievability =
        await this.prismaService.provider_retrievability_daily.findFirst({
          where: {
            provider: provider.provider,
          },
          select: {
            success_rate: true,
          },
          orderBy: {
            date: 'desc',
          },
        });

      if (retrievability) {
        retrievabilitySuccessRates.push(retrievability.success_rate);
      }
    }

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

  private async storeDealDataLowReplica(reportId: bigint) {
    const replicaDistribution =
      await this.prismaService.client_report_replica_distribution.findMany({
        where: {
          client_report_id: reportId,
        },
      });

    const lowReplicaPercentage = replicaDistribution
      .filter(
        (distribution) =>
          distribution.num_of_replicas <= this._lowReplicaThreshold,
      )
      .map((distribution) => distribution.percentage)
      .reduce((a, b) => a + b, 0);

    await this.prismaService.client_report_check_result.create({
      data: {
        client_report_id: reportId,
        check: ClientReportCheck.DEAL_DATA_REPLICATION_LOW_REPLICA,
        result: lowReplicaPercentage <= this._maxPercentageForLowReplica,
        metadata: {
          percentage: round(lowReplicaPercentage, 2),
          max_percentage_for_low_replica: this._maxPercentageForLowReplica,
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
}
