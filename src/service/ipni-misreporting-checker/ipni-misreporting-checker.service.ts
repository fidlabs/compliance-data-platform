import { Injectable, Logger } from '@nestjs/common';
import { StorageProviderIpniReportingStatus } from 'prisma/generated/client';
import { getIpniReportingWeekly } from 'prisma/generated/client/sql';
import { PrismaService } from 'src/db/prisma.service';
import {
  DEFAULT_FILPLUS_EDITION_ID,
  getFilPlusEditionWithDateTimeRange,
} from 'src/utils/filplus-edition';
import { bigIntToNumber } from 'src/utils/utils';
import { LotusApiService } from '../lotus-api/lotus-api.service';
import { LotusStateMinerInfoResponse } from '../lotus-api/types.lotus-api';
import { StorageProviderService } from '../storage-provider/storage-provider.service';
import {
  AggregatedProvidersIPNIReportingStatus,
  AggregatedProvidersIPNIReportingStatusWeekly,
  ProviderIPNIReportingStatus,
} from './types.ipni-misreporting-checker';

@Injectable()
export class IpniMisreportingCheckerService {
  private readonly logger = new Logger(IpniMisreportingCheckerService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly lotusApiService: LotusApiService,
    private readonly storageProviderService: StorageProviderService,
  ) {}

  // because of lotus api rate limiting, this function first tries to get all providers status in parallel
  // and then retries sequentially for failed requests
  // throws error if sequential retry fails for any provider
  public async getAggregatedProvidersReportingStatus(): Promise<AggregatedProvidersIPNIReportingStatus> {
    const storageProviders = await this.storageProviderService.getProviders();
    const result: ProviderIPNIReportingStatus[] = [];

    // try to execute all in parallel
    const promiseResults = await Promise.allSettled(
      storageProviders.map((storageProvider) =>
        this.getProviderReportingStatus(storageProvider.id),
      ),
    );

    for (let i = 0; i < promiseResults.length; i++) {
      if (promiseResults[i].status === 'fulfilled') {
        // prettier-ignore
        result.push((promiseResults[i] as PromiseFulfilledResult<ProviderIPNIReportingStatus>).value);
      } else {
        // retry sequentially for failed requests
        result.push(
          await this.getProviderReportingStatus(storageProviders[i].id),
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

  public async getAggregatedProvidersReportingStatusWeekly(
    roundId = DEFAULT_FILPLUS_EDITION_ID,
  ): Promise<AggregatedProvidersIPNIReportingStatusWeekly> {
    const editionDate = getFilPlusEditionWithDateTimeRange(roundId);

    const result = await this.prismaService.$queryRawTyped(
      getIpniReportingWeekly(editionDate.startDate, editionDate.endDate),
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
    return bigIntToNumber(
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
    peerId?: string,
  ): Promise<number | null> {
    if (!peerId) return null;

    const dbEmpty =
      !(await this.prismaService.ipni_publisher_advertisement.findFirst({
        where: {
          publisher_id: peerId,
        },
      }));

    if (dbEmpty) return null;

    return bigIntToNumber(
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
