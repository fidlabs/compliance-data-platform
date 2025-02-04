import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { DataCapStatsService } from '../datacapstats/datacapstats.service';
import { ClientReportChecksService } from '../client-report-checks/client-report-checks.service';
import { StorageProviderReportService } from '../storage-provider-report/storage-provider-report.service';
import { ClientService } from '../client/client.service';

@Injectable()
export class ClientReportService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly dataCapStatsService: DataCapStatsService,
    private readonly clientReportChecksService: ClientReportChecksService,
    private readonly storageProviderService: StorageProviderReportService,
    private readonly clientService: ClientService,
  ) {}

  async generateReport(clientId: string) {
    const verifiedClientData =
      await this.dataCapStatsService.fetchPrimaryClientDetails(clientId);

    if (!verifiedClientData) return null;

    const storageProviderDistribution =
      await this.storageProviderService.getStorageProviderDistribution(
        clientId,
      );

    const replicaDistribution =
      await this.clientService.getReplicationDistribution(clientId);

    const cidSharing = await this.clientService.getCidSharing(clientId);

    const report = await this.prismaService.client_report.create({
      data: {
        client: clientId,
        client_address: verifiedClientData.address,
        organization_name:
          (verifiedClientData.name ?? '') + (verifiedClientData.orgName ?? ''),
        application_url:
          this.clientService.getClientApplicationUrl(verifiedClientData),
        storage_provider_distribution: {
          create:
            storageProviderDistribution?.map((provider) => {
              return {
                ...provider,
                ...(provider.location && {
                  location: {
                    create: provider.location,
                  },
                }),
              };
            }) ?? [],
        },
        replica_distribution: {
          create: replicaDistribution,
        },
        cid_sharing: {
          create: await Promise.all(
            cidSharing.map(async (c) => ({
              ...c,
              other_client_application_url:
                this.clientService.getClientApplicationUrl(
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

  async getReports(clientId: string) {
    return await this.prismaService.client_report.findMany({
      where: {
        client: clientId,
      },
      orderBy: {
        create_date: 'desc',
      },
    });
  }

  async getLatestReport(clientId: string) {
    return this.getReport(clientId);
  }

  async getReport(clientId: string, id?: any) {
    return this.prismaService.client_report.findFirst({
      where: {
        client: clientId,
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
