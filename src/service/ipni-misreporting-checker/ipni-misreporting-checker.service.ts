import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { LotusApiService } from '../lotus-api/lotus-api.service';
import { LotusStateMinerInfoResponse } from '../lotus-api/types.lotus-api';
import {
  AggregatedProvidersIPNIReportingStatus,
  AggregatedProvidersIPNIReportingStatusWeekly,
  ProviderIPNIReportingStatus,
} from './types.ipni-misreporting-checker';
import { StorageProviderIpniReportingStatus } from 'prisma/generated/client';
import { getIpniReportingWeekly } from 'prisma/generated/client/sql';

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
  public async getAggregatedProvidersReportingStatus(): Promise<AggregatedProvidersIPNIReportingStatus> {
    const storageProviders =
      await this.prismaService.client_provider_distribution.findMany({
        distinct: ['provider'],
      });

    const result: ProviderIPNIReportingStatus[] = [];

    // try to execute all in parallel
    const promiseResults = await Promise.allSettled(
      storageProviders.map((storageProvider) =>
        this.getProviderReportingStatus(storageProvider.provider),
      ),
    );

    for (let i = 0; i < promiseResults.length; i++) {
      if (promiseResults[i].status === 'fulfilled') {
        // prettier-ignore
        result.push((promiseResults[i] as PromiseFulfilledResult<ProviderIPNIReportingStatus>).value);
      } else {
        // retry sequentially for failed requests
        result.push(
          await this.getProviderReportingStatus(storageProviders[i].provider),
        );
      }
    }

    return {
      misreporting: result.filter(
        (x) => x.status === StorageProviderIpniReportingStatus.MISREPORTING,
      ).length,
      notReporting: result.filter(
        (x) => x.status === StorageProviderIpniReportingStatus.NOT_REPORTING,
      ).length,
      ok: result.filter(
        (x) => x.status === StorageProviderIpniReportingStatus.OK,
      ).length,
      total: result.length,
    };
  }

  public async getAggregatedProvidersReportingStatusWeekly(): Promise<AggregatedProvidersIPNIReportingStatusWeekly> {
    const result = await this.prismaService.$queryRawTyped(
      getIpniReportingWeekly(),
    );
    return {
      results: result.map((r) => ({
        week: r.week,
        total: r.total,
        misreporting: r.misreporting,
        notReporting: r.not_reporting,
        ok: r.ok,
      })),
    };
  }

  public async getProviderReportingStatus(
    storageProviderId: string,
    minerInfo?: LotusStateMinerInfoResponse,
  ): Promise<ProviderIPNIReportingStatus> {
    minerInfo ??= await this.lotusApiService.getMinerInfo(storageProviderId);

    const actualClaimsCount =
      await this.getProviderActualClaimsCount(storageProviderId);

    const ipniReportedClaimsCount =
      await this.getProviderIPNIReportedClaimsCountByPeerId(
        minerInfo.result.PeerId,
      );

    const status = !ipniReportedClaimsCount
      ? StorageProviderIpniReportingStatus.NOT_REPORTING
      : ipniReportedClaimsCount < actualClaimsCount * 0.5
        ? StorageProviderIpniReportingStatus.MISREPORTING
        : StorageProviderIpniReportingStatus.OK;

    return {
      status: status,
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
    peerId?: string | null,
  ): Promise<number | null> {
    if (!peerId) return null;

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
