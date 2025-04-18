import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { ClientReportChecksService } from '../client-report-checks/client-report-checks.service';
import { StorageProviderReportService } from '../storage-provider-report/storage-provider-report.service';
import { ClientService } from '../client/client.service';

@Injectable()
export class ClientReportService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly clientReportChecksService: ClientReportChecksService,
    private readonly storageProviderService: StorageProviderReportService,
    private readonly clientService: ClientService,
  ) {}

  public async generateReport(clientIdOrAddress: string, returnFull = false) {
    const clientData =
      await this.clientService.getClientData(clientIdOrAddress);

    if (!clientData) return null;

    const storageProviderDistribution =
      await this.storageProviderService.getStorageProviderDistribution(
        clientData[0].addressId,
      );

    const replicaDistribution =
      await this.clientService.getReplicationDistribution(
        clientData[0].addressId,
      );

    const cidSharing = await this.clientService.getCidSharing(
      clientData[0].addressId,
    );

    const report = await this.prismaService.client_report.create({
      data: {
        client: clientData[0].addressId,
        client_address: clientData[0].address,
        allocators: clientData.map((c) => c.verifierAddressId),
        organization_name:
          `${clientData[0].name ?? ''} ${clientData[0].orgName ?? ''}`.trim(),
        application_url: this.clientService.getClientApplicationUrl(
          clientData[0],
        ),
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
                  (await this.clientService.getClientData(c.other_client))[0],
                ),
            })),
          ),
        },
      },
    });

    await this.clientReportChecksService.storeReportChecks(report.id);

    return this.getReport(report.client, report.id, returnFull);
  }

  public async getReports(clientIdOrAddress: string) {
    return await this.prismaService.client_report.findMany({
      where: {
        OR: [
          {
            client: clientIdOrAddress,
          },
          {
            client_address: clientIdOrAddress,
          },
        ],
      },
      orderBy: {
        create_date: 'desc',
      },
    });
  }

  public async getLatestReport(clientIdOrAddress: string, full = false) {
    return this.getReport(clientIdOrAddress, undefined, full);
  }

  public async getReport(clientIdOrAddress: string, id?: any, full = false) {
    return this.prismaService.client_report.findFirst({
      where: {
        OR: [
          {
            client: clientIdOrAddress,
            id: id ?? undefined,
          },
          {
            client_address: clientIdOrAddress,
            id: id ?? undefined,
          },
        ],
      },
      include: {
        storage_provider_distribution: {
          omit: {
            ...(!full && {
              id: true,
              client_report_id: true,
            }),
          },
          include: {
            location: {
              omit: {
                ...(!full && {
                  id: true,
                  provider_distribution_id: true,
                }),
              },
            },
          },
        },
        replica_distribution: {
          omit: {
            ...(!full && {
              id: true,
              client_report_id: true,
            }),
          },
        },
        cid_sharing: {
          omit: {
            ...(!full && {
              id: true,
              client_report_id: true,
            }),
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
