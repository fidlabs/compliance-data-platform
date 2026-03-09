import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { IpniMisreportingCheckerService } from '../ipni-misreporting-checker/ipni-misreporting-checker.service';
import { LocationService } from '../location/location.service';
import { LotusApiService } from '../lotus-api/lotus-api.service';
import { StorageProviderUrlFinderService } from '../storage-provider-url-finder/storage-provider-url-finder.service';

@Injectable()
export class StorageProviderReportService {
  private readonly logger = new Logger(StorageProviderReportService.name);

  constructor(
    private readonly locationService: LocationService,
    private readonly prismaService: PrismaService,
    private readonly lotusApiService: LotusApiService,
    private readonly ipniMisreportingCheckerService: IpniMisreportingCheckerService,
    private readonly storageProviderUrlFinderService: StorageProviderUrlFinderService,
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

        const location = await this.locationService.getLocation(
          minerInfo.result.Multiaddrs,
        );

        const {
          bandwidthMetric,
          consistentRetrievabilityMetric,
          inconsistentRetrievabilityMetric,
          retrievabilitySuccessRateMetric,
          ttfbMetric,
        } =
          await this.storageProviderUrlFinderService.getUrlFinderLastMetricsValuesForProvider(
            clientProviderDistribution.provider,
          );

        return {
          ...clientProviderDistribution,
          retrievability_success_rate_url_finder:
            retrievabilitySuccessRateMetric,
          consistent_retrievability: consistentRetrievabilityMetric,
          inconsistent_retrievability: inconsistentRetrievabilityMetric,
          ttfb: ttfbMetric,
          bandwidth: bandwidthMetric,
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

  // returns 0 - 1
  public async getStorageProviderUrlFinderRetrievability(
    storageProviderId: string,
  ): Promise<number | null> {
    const data =
      await this.prismaService.provider_url_finder_retrievability_daily.findFirst(
        {
          where: {
            provider: storageProviderId,
          },
          orderBy: {
            date: 'desc',
          },
        },
      );

    return data?.success_rate ?? null;
  }
}
