import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { DataCapStatsService } from '../datacapstats/datacapstats.service';
import { LotusApiService } from '../lotus-api/lotus-api.service';
import { LocationService } from '../location/location.service';
import { IPResponse } from '../location/types.location';
import { ClientReportChecksService } from '../client-report-checks/client-report-checks.service';

@Injectable()
export class ClientReportService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly dataCapStatsService: DataCapStatsService,
    private readonly lotusApiService: LotusApiService,
    private readonly locationService: LocationService,
    private readonly clientReportChecksService: ClientReportChecksService,
  ) {}

  async generateReport(client: string) {
    const cidSharing = await this.getCidSharing(client);

    const verifiedClientResponse =
      await this.dataCapStatsService.fetchClientDetails(client);

    const verifiedClientData =
      this.dataCapStatsService.findPrimaryClientDetails(
        verifiedClientResponse.data,
      );

    if (!verifiedClientData) return null;

    const storageProviderDistribution =
      await this.getStorageProviderDistributionWithLocation(client);

    const replicaDistribution = await this.getReplicationDistribution(client);

    const providersRetrievability =
      await this.getStorageProvidersRetrievability(storageProviderDistribution);

    const report = await this.prismaService.client_report.create({
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
                retrievability: {
                  create: {
                    success_rate: providersRetrievability.get(
                      storageProviderDistribution.provider,
                    ),
                  },
                },
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

    await this.clientReportChecksService.storeReportChecks(report.id);

    return report;
  }

  private async getStorageProvidersRetrievability(
    providers: {
      provider: string;
    }[],
  ): Promise<Map<string, number | null>> {
    return new Map(
      await Promise.all(
        providers?.map(
          async (provider) =>
            [
              provider.provider,
              await this.getStorageProviderRetrievability(provider.provider),
            ] as [string, number | null],
        ) ?? [],
      ),
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

  private async getStorageProviderDistributionWithLocation(client: string) {
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
    return this.getClientReport(client);
  }

  async getClientReport(client: string, id?: any) {
    return this.prismaService.client_report.findFirst({
      where: {
        client: client,
        id: id ?? undefined,
      },
      include: {
        storage_provider_distribution: {
          omit: {
            id: true,
            client_report_id: true,
          },
          include: {
            retrievability: {
              omit: {
                id: true,
                provider_distribution_id: true,
              },
            },
            location: {
              omit: {
                id: true,
                provider_distribution_id: true,
              },
            },
          },
        },
        replica_distribution: {
          omit: {
            id: true,
            client_report_id: true,
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
