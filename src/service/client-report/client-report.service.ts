import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { DataCapStatsService } from '../datacapstats/datacapstats.service';
import { DateTime } from 'luxon';
import { LotusApiService } from '../proteus-shield/lotus-api.service';
import { LocationService } from '../location/location.service';
import { IPResponse } from '../location/types.location';

@Injectable()
export class ClientReportService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly dataCapStatsService: DataCapStatsService,
    private readonly proteusShieldService: LotusApiService,
    private readonly locationService: LocationService,
  ) {}

  async generateReport(client: string) {
    const verifiedClientResponse =
      await this.dataCapStatsService.fetchClientDetails(client);

    const verifiedClientData =
      this.dataCapStatsService.findPrimaryClientDetails(
        verifiedClientResponse.data,
      );

    const storageProviderDistribution =
      await this.getStorageProviderDistributionWithLocation(client);

    const replicaDistribution = await this.getReplicationDistribution(client);

    const cidSharing = await this.getCidSharing(client);

    await this.prismaService.client_report.create({
      data: {
        client: client,
        client_address: verifiedClientData?.address,
        organization_name:
          (verifiedClientData?.name ?? '') +
          (verifiedClientData?.orgName ?? ''),
        storage_provider_distribution: {
          create: storageProviderDistribution?.map(
            (storageProviderDistribution) => {
              return {
                provider: storageProviderDistribution.provider,
                unique_data_size: storageProviderDistribution.unique_data_size,
                total_deal_size: storageProviderDistribution.total_deal_size,
                ...(storageProviderDistribution.location && {
                  location: {
                    create: storageProviderDistribution.location,
                  },
                }),
              };
            },
          ),
        },
        replica_distribution: {
          create: replicaDistribution,
        },
        cid_sharing: {
          create: cidSharing,
        },
      },
    });
  }

  private async getStorageProviderDistributionWithLocation(client: string) {
    const lastWeek = DateTime.now()
      .toUTC()
      .minus({ week: 1 })
      .startOf('week')
      .toJSDate();

    const clientProviderDistribution =
      await this.prismaService.client_provider_distribution_weekly.findMany({
        where: {
          client: client,
          week: lastWeek,
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
    week: Date;
    client: string;
    provider: string;
    total_deal_size: bigint;
    unique_data_size: bigint;
  }): Promise<IPResponse | null> {
    const minerInfo = await this.proteusShieldService.getMinerInfo(
      clientProviderDistribution.provider,
    );

    return await this.locationService.getLocation(minerInfo.result.Multiaddrs);
  }

  private async getReplicationDistribution(client: string) {
    const distribution =
      await this.prismaService.client_replica_distribution.findMany({
        where: {
          client: client,
        },
        omit: {
          client: true,
        },
      });

    const total = distribution.reduce(
      (acc, cur) => acc + cur.total_deal_size,
      0n,
    );

    return distribution?.map((distribution) => ({
      ...distribution,
      percentage: Number((distribution.total_deal_size * 10000n) / total) / 100,
    }));
  }

  private async getCidSharing(client: string) {
    return this.prismaService.cid_sharing.findMany({
      where: {
        client: client,
      },
      omit: {
        client: true,
      },
    });
  }

  async getClientReports(client: string) {
    return await this.prismaService.client_report.findMany({
      where: {
        client: client,
      },
      orderBy: {
        create_date: 'desc',
      },
    });
  }

  async getClientLatestReport(client: string) {
    return this.prismaService.client_report.findFirst({
      where: {
        client: client,
      },
      include: {
        storage_provider_distribution: {
          omit: {
            id: true,
          },
          include: {
            location: {
              omit: {
                id: true,
              },
            },
          },
        },
        replica_distribution: {
          omit: {
            id: true,
          },
        },
        cid_sharing: {
          omit: {
            id: true,
          },
        },
      },
      orderBy: {
        create_date: 'desc',
      },
    });
  }

  async getClientReport(client: string, id: any) {
    return this.prismaService.client_report.findFirst({
      where: {
        client: client,
        id: id,
      },
      include: {
        storage_provider_distribution: {
          omit: {
            id: true,
          },
          include: {
            location: {
              omit: {
                id: true,
              },
            },
          },
        },
        replica_distribution: {
          omit: {
            id: true,
          },
        },
        cid_sharing: {
          omit: {
            id: true,
          },
        },
      },
      orderBy: {
        create_date: 'desc',
      },
    });
  }
}
