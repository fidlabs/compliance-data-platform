import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { LotusApiService } from '../lotus-api/lotus-api.service';
import { LotusStateMinerInfoResponse } from '../lotus-api/types.lotus-api';

@Injectable()
export class IpniMisreportingCheckerService {
  private readonly logger = new Logger(IpniMisreportingCheckerService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly lotusApiService: LotusApiService,
  ) {}

  public async getAllProvidersMisreportingStatus(): Promise<boolean[]> {
    const storageProviders =
      await this.prismaService.client_provider_distribution.findMany({
        distinct: ['provider'],
      });

    const result: boolean[] = [];

    // need to do this sequentially because of the lotus api rate limit
    // TODO ll: really? check that
    for (const storageProvider of storageProviders) {
      result.push(
        (await this.getProviderMisreportingStatus(storageProvider.provider))
          .misreporting,
      );
    }

    return result;
  }

  public async getProviderMisreportingStatus(
    storageProviderId: string,
    minerInfo?: LotusStateMinerInfoResponse,
  ): Promise<{
    misreporting: boolean;
    actualClaimsCount: number;
    ipniReportedClaimsCount: number | null;
  }> {
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
