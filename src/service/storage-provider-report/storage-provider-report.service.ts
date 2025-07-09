import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { IpniMisreportingCheckerService } from '../ipni-misreporting-checker/ipni-misreporting-checker.service';
import { LocationService } from '../location/location.service';
import { IPResponse } from '../location/types.location';
import { LotusApiService } from '../lotus-api/lotus-api.service';
import { LotusStateMinerInfoResponse } from '../lotus-api/types.lotus-api';

@Injectable()
export class StorageProviderReportService {
  private readonly logger = new Logger(StorageProviderReportService.name);

  constructor(
    private readonly locationService: LocationService,
    private readonly prismaService: PrismaService,
    private readonly lotusApiService: LotusApiService,
    private readonly ipniMisreportingCheckerService: IpniMisreportingCheckerService,
  ) {}

  public async getStorageProviderDistribution(clientId: string) {
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

        const ipniReportingStatus =
          await this.ipniMisreportingCheckerService.getProviderReportingStatus(
            clientProviderDistribution.provider,
            minerInfo,
          );

        let location: IPResponse | null = null;

        try {
          location =
            await this.getClientProviderDistributionLocation(minerInfo);
        } catch (error) {
          this.logger.error(
            `Error getting location for provider ${clientProviderDistribution.provider}: ${error}`,
          );
        }

        const {
          retrievability_success_rate,
          retrievability_success_rate_http,
        } = await this.getStorageProviderRetrievability(
          clientProviderDistribution.provider,
        );

        return {
          ...clientProviderDistribution,
          retrievability_success_rate,
          retrievability_success_rate_http,
          ipni_reporting_status: ipniReportingStatus.status,
          ipni_reported_claims_count:
            ipniReportingStatus.ipniReportedClaimsCount,
          claims_count: ipniReportingStatus.actualClaimsCount,
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

  private async getStorageProviderRetrievability(providerId: string): Promise<{
    retrievability_success_rate: number;
    retrievability_success_rate_http: number;
  } | null> {
    const result =
      // get data from the last 7 full days
      await this.prismaService.provider_retrievability_daily.aggregate({
        _sum: {
          total: true,
          successful: true,
          successful_http: true,
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

    if (result._sum.total > 0) {
      const retrievability_success_rate =
        result._sum.successful / result._sum.total;

      const retrievability_success_rate_http =
        result._sum.successful_http / result._sum.total;

      return { retrievability_success_rate, retrievability_success_rate_http };
    } else {
      return {
        retrievability_success_rate: null,
        retrievability_success_rate_http: null,
      };
    }
  }

  private async getClientProviderDistributionLocation(
    minerInfo: LotusStateMinerInfoResponse,
  ): Promise<IPResponse | null> {
    return this.locationService.getLocation(minerInfo.result.Multiaddrs);
  }
}
