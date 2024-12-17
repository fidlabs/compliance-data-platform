import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { DataCapStatsService } from '../datacapstats/datacapstats.service';
import { ClientReportChecksService } from '../client-report-checks/client-report-checks.service';
import { VerifiedClientData } from '../datacapstats/types.datacapstats';
import { StorageProviderService } from '../storage-provider/storage-provider.service';

@Injectable()
export class ClientReportService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly dataCapStatsService: DataCapStatsService,
    private readonly clientReportChecksService: ClientReportChecksService,
    private readonly storageProviderService: StorageProviderService,
  ) {}

  async generateReport(client: string) {
    const verifiedClientData =
      await this.dataCapStatsService.fetchPrimaryClientDetails(client);

    if (!verifiedClientData) return null;

    const storageProviderDistribution =
      await this.storageProviderService.getStorageProviderDistributionWithLocation(
        client,
      );

    const replicaDistribution = await this.getReplicationDistribution(client);

    const cidSharing = await this.getCidSharing(client);

    const report = await this.prismaService.client_report.create({
      data: {
        client: client,
        client_address: verifiedClientData.address,
        organization_name:
          (verifiedClientData.name ?? '') + (verifiedClientData.orgName ?? ''),
        application_url: this.getClientApplicationUrl(verifiedClientData),
        storage_provider_distribution: {
          create: await Promise.all(
            storageProviderDistribution?.map(async (provider) => {
              return {
                provider: provider.provider,
                unique_data_size: provider.unique_data_size,
                total_deal_size: provider.total_deal_size,
                retrievability_success_rate:
                  await this.storageProviderService.getStorageProviderRetrievability(
                    provider.provider,
                  ),
                ...(provider.location && {
                  location: {
                    create: {
                      ip: provider.location.ip,
                      city: provider.location.city,
                      region: provider.location.region,
                      country: provider.location.country,
                      loc: provider.location.loc,
                      org: provider.location.org,
                      postal: provider.location.postal,
                      timezone: provider.location.timezone,
                    },
                  },
                }),
              };
            }) ?? [],
          ),
        },
        replica_distribution: {
          create: replicaDistribution,
        },
        cid_sharing: {
          create: await Promise.all(
            cidSharing.map(async (c) => ({
              ...c,
              other_client_application_url: this.getClientApplicationUrl(
                await this.dataCapStatsService.fetchPrimaryClientDetails(
                  c.other_client,
                ),
              ),
            })),
          ),
        },
      },
    });

    await this.clientReportChecksService.storeReportChecks(report.id);

    return report;
  }

  private getClientApplicationUrl(
    verifiedClientData?: VerifiedClientData,
  ): string | null {
    let applicationUrl = verifiedClientData?.allowanceArray?.[0]?.auditTrail;
    if (applicationUrl === 'n/a') applicationUrl = null;
    return applicationUrl;
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
            client_report_id: true,
          },
        },
        check_results: {
          select: {
            check: true,
            result: true,
            metadata: true,
          },
        },
      },
      orderBy: {
        create_date: 'desc',
      },
    });
  }
}
