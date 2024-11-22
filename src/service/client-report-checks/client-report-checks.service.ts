import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../db/prisma.service';
import { ClientReportCheck } from 'prisma/generated/client';

@Injectable()
export class ClientReportChecksService {
  _maxProviderDealPercentage: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    this._maxProviderDealPercentage = configService.get<number>(
      'CLIENT_REPORT_MAX_PROVIDER_DEAL_PERCENTAGE',
    );
  }

  async storeStorageProviderDistributionChecks(reportId: bigint) {
    await this.storeProvidersExceedingProviderDealResults(reportId);
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
          violating_ids: providersExceedingProviderDeal,
        },
      });
    } else {
      await this.prismaService.client_report_check_result.create({
        data: {
          client_report_id: reportId,
          check:
            ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_EXCEED_PROVIDER_DEAL,
          result: true,
        },
      });
    }
  }
}
