import { Injectable, Logger } from '@nestjs/common';
import { LocationService } from '../location/location.service';
import { PrismaService } from '../../db/prisma.service';
import { IPResponse } from '../location/types.location';
import { LotusApiService } from '../lotus-api/lotus-api.service';
import { LotusStateMinerInfoResponse } from '../lotus-api/types.lotus-api';
import { IpniMisreportingCheckerService } from '../ipni-misreporting-checker/ipni-misreporting-checker.service';

@Injectable()
export class StorageProviderService {
  private readonly logger = new Logger(StorageProviderService.name);

  constructor(
    private readonly locationService: LocationService,
    private readonly prismaService: PrismaService,
    private readonly lotusApiService: LotusApiService,
    private readonly ipniMisreportingCheckerService: IpniMisreportingCheckerService,
  ) {}

  async getStorageProviderDistribution(clientId: string) {
    const clientProviderDistribution =
      await this.prismaService.client_provider_distribution.findMany({
        where: {
          client: clientId,
        },
        omit: {
          client: true,
        },
      });

    return await Promise.all(
      clientProviderDistribution.map(async (clientProviderDistribution) => {
        const minerInfo = await this.lotusApiService.getMinerInfo(
          clientProviderDistribution.provider,
        );

        const ipniMisreportingStatus =
          await this.ipniMisreportingCheckerService.getProviderMisreportingStatus(
            clientProviderDistribution.provider,
            minerInfo,
          );

        const location =
          await this.getClientProviderDistributionLocation(minerInfo);

        return {
          ...clientProviderDistribution,
          // TODO when business is ready switch to http success rate
          retrievability_success_rate:
            await this.getStorageProviderRetrievability(
              clientProviderDistribution.provider,
            ),
          ipni_misreporting: ipniMisreportingStatus.misreporting,
          ipni_reported_claims_count:
            ipniMisreportingStatus.ipniReportedClaimsCount,
          claims_count: ipniMisreportingStatus.actualClaimsCount,
          ...(location && {
            location: {
              ip: location.ip,
              city: location.city,
              region: location.region,
              country: location.country,
              loc: location.loc,
              org: location.org,
              postal: location.postal,
              timezone: location.timezone,
            },
          }),
        };
      }),
    );
  }

  private async getStorageProviderRetrievability(
    providerId: string,
  ): Promise<number | null> {
    const result =
      // get data from the last 7 full days
      await this.prismaService.provider_retrievability_daily.aggregate({
        _sum: {
          total: true,
          successful: true,
        },
        where: {
          provider: providerId,
          date: {
            gte: new Date( // a week ago at 00:00
              new Date(new Date().setDate(new Date().getDate() - 7)).setHours(
                0,
                0,
                0,
                0,
              ),
            ),
          },
        },
      });

    return result._sum.total > 0
      ? result._sum.successful / result._sum.total
      : null;
  }

  private async getClientProviderDistributionLocation(
    minerInfo: LotusStateMinerInfoResponse,
  ): Promise<IPResponse | null> {
    return this.locationService.getLocation(minerInfo.result.Multiaddrs);
  }
}
