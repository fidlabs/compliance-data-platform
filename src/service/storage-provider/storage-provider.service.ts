import { Injectable } from '@nestjs/common';
import { LocationService } from '../location/location.service';
import { PrismaService } from '../../db/prisma.service';
import { IPResponse } from '../location/types.location';
import { LotusApiService } from '../lotus-api/lotus-api.service';

@Injectable()
export class StorageProviderService {
  constructor(
    private readonly locationService: LocationService,
    private readonly prismaService: PrismaService,
    private readonly lotusApiService: LotusApiService,
  ) {}

  async getStorageProviderDistributionWithLocation(client: string) {
    const clientProviderDistribution =
      await this.prismaService.client_provider_distribution.findMany({
        where: {
          client: client,
        },
      });

    return await Promise.all(
      clientProviderDistribution.map(async (clientProviderDistribution) => ({
        ...clientProviderDistribution,
        location: await this.getClientProviderDistributionLocation(
          clientProviderDistribution,
        ),
      })),
    );
  }

  private async getClientProviderDistributionLocation(clientProviderDistribution: {
    client: string;
    provider: string;
    total_deal_size: bigint;
    unique_data_size: bigint;
  }): Promise<IPResponse | null> {
    const minerInfo = await this.lotusApiService.getMinerInfo(
      clientProviderDistribution.provider,
    );

    return await this.locationService.getLocation(minerInfo.result.Multiaddrs);
  }
}
