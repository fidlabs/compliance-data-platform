import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { LotusApiService } from '../lotus-api/lotus-api.service';
import { LotusStateMinerInfoResponse } from '../lotus-api/types.lotus-api';
import {
  AggregatedProvidersIPNIMisreportingStatus,
  ProviderIPNIMisreportingStatus,
} from './types.ipni-misreporting-checker';

@Injectable()
export class IpniMisreportingCheckerService {
  private readonly logger = new Logger(IpniMisreportingCheckerService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly lotusApiService: LotusApiService,
  ) {}

  // because of lotus api rate limiting, this function first tries to get all providers status in parallel
  // and then retries sequentially for failed requests
  // throws error if sequential retry fails for any provider
  public async getAggregatedProvidersMisreportingStatus(): Promise<AggregatedProvidersIPNIMisreportingStatus> {
    const storageProviders =
      await this.prismaService.client_provider_distribution.findMany({
        distinct: ['provider'],
      });

    const result: ProviderIPNIMisreportingStatus[] = [];
    const failedProviders: string[] = [];

    // try to execute all in parallel
    const promises = storageProviders.map((storageProvider) =>
      this.getProviderMisreportingStatus(storageProvider.provider),
    );

    const results = await Promise.allSettled(promises);

    results.forEach((promiseResult, index) => {
      if (promiseResult.status === 'fulfilled') {
        result.push(promiseResult.value as ProviderIPNIMisreportingStatus);
      } else {
        failedProviders.push(storageProviders[index].provider);
      }
    });

    // retry sequentially for failed requests
    for (const provider of failedProviders) {
      result.push(await this.getProviderMisreportingStatus(provider));
    }

    return {
      misreporting: result.filter((x) => x.misreporting).length,
      total: result.length,
    };
  }

  public async getProviderMisreportingStatus(
    storageProviderId: string,
    minerInfo?: LotusStateMinerInfoResponse,
  ): Promise<ProviderIPNIMisreportingStatus> {
    minerInfo ??= await this.lotusApiService.getMinerInfo(storageProviderId);

    const actualClaimsCount =
      await this.getProviderActualClaimsCount(storageProviderId);

    const ipniReportedClaimsCount =
      await this.getProviderIPNIReportedClaimsCountByPeerId(
        minerInfo.result.PeerId,
      );

    return {
      misreporting: ipniReportedClaimsCount < actualClaimsCount * 0.5,
      actualClaimsCount: actualClaimsCount,
      ipniReportedClaimsCount: ipniReportedClaimsCount,
    };
  }

  private async getProviderActualClaimsCount(
    storageProviderId: string,
  ): Promise<number> {
    return Number(
      (
        await this.prismaService.client_provider_distribution.aggregate({
          _sum: {
            claims_count: true,
          },
          where: {
            provider: storageProviderId,
          },
        })
      )._sum.claims_count,
    );
  }

  private async getProviderIPNIReportedClaimsCountByPeerId(
    peerId: string,
  ): Promise<number | null> {
    const dbEmpty =
      !(await this.prismaService.ipni_publisher_advertisement.findFirst({
        where: {
          publisher_id: peerId,
        },
      }));

    if (dbEmpty) return null;

    return Number(
      (
        await this.prismaService.ipni_publisher_advertisement.aggregate({
          _sum: {
            entries_number: true,
          },
          where: {
            publisher_id: peerId,
            is_rm: false,
          },
        })
      )._sum.entries_number,
    );
  }
}
