import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { ClientReportChecksService } from '../client-report-checks/client-report-checks.service';
import { StorageProviderReportService } from '../storage-provider-report/storage-provider-report.service';
import { ClientService } from '../client/client.service';
import { GlifAutoVerifiedAllocatorId } from 'src/utils/constants';
import { AllocatorService } from '../allocator/allocator.service';
import { EthApiService } from '../eth-api/eth-api.service';

@Injectable()
export class ClientReportService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly clientReportChecksService: ClientReportChecksService,
    private readonly storageProviderService: StorageProviderReportService,
    private readonly clientService: ClientService,
    private readonly allocatorService: AllocatorService,
    private readonly ethApiService: EthApiService,
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

    const allocators = clientData.map((c) => c.verifierAddressId);

    const mainAllocatorId = // take first non-glif allocator addressId
      allocators?.[0] === GlifAutoVerifiedAllocatorId && allocators?.length > 1
        ? allocators[1]
        : allocators?.[0];

    const mainAllocatorRegistryInfo =
      await this.allocatorService.getAllocatorRegistryInfo(mainAllocatorId);

    const bookkeepingInfo = await this.clientService.getClientBookkeepingInfo(
      clientData[0].addressId,
    );

    const maxDeviation = bookkeepingInfo?.clientContractAddress
      ? await this.ethApiService.getClientContractMaxDeviation(
          bookkeepingInfo.clientContractAddress,
          clientData[0].addressId,
        )
      : null;

    const report = await this.prismaService.client_report.create({
      data: {
        client: clientData[0].addressId,
        client_address: clientData[0].address,
        allocators: allocators,
        allocator_required_copies:
          mainAllocatorRegistryInfo?.application.required_replicas,
        allocator_required_sps:
          mainAllocatorRegistryInfo?.application.required_sps,
        organization_name:
          `${clientData[0].name ?? ''} ${clientData[0].orgName ?? ''}`.trim(),
        application_url: this.clientService.getClientApplicationUrl(
          clientData[0],
        ),
        is_public_dataset: bookkeepingInfo?.isPublicDataset,
        using_client_contract: !!bookkeepingInfo?.clientContractAddress,
        client_contract_max_deviation: maxDeviation,
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
