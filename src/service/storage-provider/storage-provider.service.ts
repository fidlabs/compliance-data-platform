import { Injectable, Logger } from '@nestjs/common';
import { LocationService } from '../location/location.service';
import { PrismaService } from '../../db/prisma.service';
import { IPResponse } from '../location/types.location';
import { LotusApiService } from '../lotus-api/lotus-api.service';

@Injectable()
export class StorageProviderService {
  private readonly logger = new Logger(StorageProviderService.name);

  constructor(
    private readonly locationService: LocationService,
    private readonly prismaService: PrismaService,
    private readonly lotusApiService: LotusApiService,
  ) {}

  async getStorageProviderDistribution(client: string) {
    const clientProviderDistribution =
      await this.prismaService.client_provider_distribution.findMany({
        where: {
          client: client,
        },
      });

    return await Promise.all(
      clientProviderDistribution.map(async (clientProviderDistribution) => {
        const location = await this.getClientProviderDistributionLocation(
          clientProviderDistribution,
        );

        return {
          ...clientProviderDistribution,
          retrievability_success_rate:
            await this.getStorageProviderRetrievability(
              clientProviderDistribution.provider,
            ),
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
    provider: string,
  ): Promise<number | null> {
    const result =
      // get data from the last 7 full days
      await this.prismaService.provider_retrievability_daily.aggregate({
        _sum: {
          total: true,
          successful: true,
        },
        where: {
          provider: provider,
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

  private async getClientProviderDistributionLocation(clientProviderDistribution: {
    client: string;
    provider: string;
    total_deal_size: bigint;
    unique_data_size: bigint;
  }): Promise<IPResponse | null> {
    let minerInfo;

    try {
      minerInfo = await this.lotusApiService.getMinerInfo(
        clientProviderDistribution.provider,
      );
    } catch (e) {
      this.logger.error(
        `Error getting miner info for ${clientProviderDistribution.provider}`,
        e,
      );
      throw e;
    }

    try {
      return await this.locationService.getLocation(
        minerInfo.result.Multiaddrs,
      );
    } catch (e) {
      this.logger.error(
        `Error getting location for ${minerInfo.result.Multiaddrs}`,
        e,
      );
      throw e;
    }
  }
}
