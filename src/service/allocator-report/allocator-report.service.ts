import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { StorageProviderReportService } from '../storage-provider-report/storage-provider-report.service';
import { ClientService } from '../client/client.service';
import { AllocatorService } from '../allocator/allocator.service';
import { ClientWithAllowance } from '../client/types.client';
import { AllocatorReportChecksService } from '../allocator-report-checks/allocator-report-checks.service';

@Injectable()
export class AllocatorReportService {
  private readonly logger = new Logger(AllocatorReportService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly storageProviderService: StorageProviderReportService,
    private readonly clientService: ClientService,
    private readonly allocatorService: AllocatorService,
    private readonly allocatorReportChecksService: AllocatorReportChecksService,
  ) {}

  public async generateReport(allocatorIdOrAddress: string) {
    const allocatorData =
      await this.allocatorService.getAllocatorData(allocatorIdOrAddress);

    if (!allocatorData) return null;

    const [verifiedClients, allocatorInfo] = await Promise.all([
      this.clientService.getClientsByAllocator(allocatorData.addressId),
      this.allocatorService.getAllocatorRegistryInfo(allocatorData.addressId),
    ]);

    const clientsData = this.getGrantedDatacapInClients(verifiedClients);

    const storageProviderDistribution =
      await this.getStorageProviderDistribution(
        verifiedClients.map((client) => {
          return client.addressId;
        }),
      );

    const report = await this.prismaService.allocator_report.create({
      data: {
        allocator: allocatorData.addressId,
        address: allocatorData.address,
        name: allocatorData.name || null,
        multisig: allocatorData.isMultisig,
        avg_retrievability_success_rate:
          storageProviderDistribution.reduce(
            (acc, curr) => acc + curr.retrievability_success_rate,
            0,
          ) / storageProviderDistribution.length,
        avg_retrievability_success_rate_http:
          storageProviderDistribution.reduce(
            (acc, curr) => acc + curr.retrievability_success_rate_http,
            0,
          ) / storageProviderDistribution.length,
        clients_number: verifiedClients.length,
        data_types: allocatorInfo?.application.data_types ?? [],
        required_copies: allocatorInfo?.application.required_replicas,
        required_sps: allocatorInfo?.application.required_sps,
        clients: {
          create: await Promise.all(
            verifiedClients.map(async (client) => {
              return {
                client_id: client.addressId,
                name: client.name || null,
                allocators: (
                  await this.clientService.getClientData(client.addressId)
                ).map((c) => c.verifierAddressId),
                allocations_number: client.allowanceArray.length,
                application_url:
                  this.clientService.getClientApplicationUrl(client),
                application_timestamp: client.allowanceArray?.[0]
                  ?.issueCreateTimestamp
                  ? new Date(
                      client.allowanceArray[0].issueCreateTimestamp * 1000,
                    )
                  : null,
                total_allocations: client.allowanceArray.reduce(
                  (acc, curr) => acc + curr.allowance,
                  0,
                ),
              };
            }),
          ),
        },
        client_allocations: {
          create: clientsData.map((clientData) => {
            return {
              client_id: clientData.addressId,
              allocation: clientData.allocation,
              timestamp: new Date(clientData.allocationTimestamp * 1000),
            };
          }),
        },
        storage_provider_distribution: {
          create: storageProviderDistribution?.map((provider) => {
            return {
              ...provider,
              ...(provider.location && {
                location: {
                  create: provider.location,
                },
              }),
            };
          }),
        },
      },
    });

    await this.allocatorReportChecksService.storeReportChecks(report.id);

    return this.getReport(report.allocator, report.id);
  }

  private async getStorageProviderDistribution(clientIds: string[]) {
    const storageProviderDistribution = [];

    for (const clientId of clientIds) {
      storageProviderDistribution.push(
        ...(await this.storageProviderService.getStorageProviderDistribution(
          clientId,
        )),
      );
    }

    const totalDatacap = Number(
      storageProviderDistribution.reduce(
        (acc, curr) => acc + curr.total_deal_size,
        0n,
      ),
    );

    return storageProviderDistribution.map((provider) => {
      return {
        ...provider,
        perc_of_total_datacap:
          (Number(provider.total_deal_size) / totalDatacap) * 100,
      };
    });
  }

  public async getReports(allocatorIdOrAddress: string) {
    return await this.prismaService.allocator_report.findMany({
      where: {
        OR: [
          {
            allocator: allocatorIdOrAddress,
          },
          {
            address: allocatorIdOrAddress,
          },
        ],
      },
      orderBy: {
        create_date: 'desc',
      },
    });
  }

  public async getLatestReport(allocatorIdOrAddress: string) {
    return this.getReport(allocatorIdOrAddress);
  }

  public async getReport(allocatorIdOrAddress: string, id?: string) {
    const report = await this.prismaService.allocator_report.findFirst({
      where: {
        OR: [
          {
            allocator: allocatorIdOrAddress,
            id: id ?? undefined,
          },
          {
            address: allocatorIdOrAddress,
            id: id ?? undefined,
          },
        ],
      },
      include: {
        clients: {
          omit: {
            id: true,
            allocator_report_id: true,
          },
        },
        client_allocations: {
          omit: {
            id: true,
            allocator_report_id: true,
          },
          orderBy: [{ client_id: 'asc' }, { timestamp: 'asc' }],
        },
        storage_provider_distribution: {
          omit: {
            id: true,
            allocator_report_id: true,
          },
          include: {
            location: {
              omit: {
                id: true,
                provider_distribution_id: true,
              },
            },
          },
          orderBy: {
            perc_of_total_datacap: 'desc',
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

    return (
      report && {
        ...report,
        clients: report.clients?.map((client) => ({
          ...client,
          allocations: report.client_allocations
            ?.filter((allocation) => allocation.client_id === client.client_id)
            ?.map((allocation) => ({
              ...allocation,
              client_id: undefined,
            })),
        })),
        client_allocations: undefined,
      }
    );
  }

  private getGrantedDatacapInClients(clientsData: ClientWithAllowance[]) {
    const _clientsData = clientsData.map((e) => ({
      addressId: e.addressId,
      allowanceArray: e.allowanceArray,
      clientName: e.name,
    }));

    return _clientsData
      .map((data) => {
        return data.allowanceArray
          .filter((allowanceItem) => {
            if (allowanceItem.allowance === undefined) {
              this.logger.error(
                `Allowance is undefined for client ${allowanceItem.addressId}. Please investigate.`,
              );
              return false;
            }
            return true;
          })
          .map((allowanceItem) => ({
            allocation: allowanceItem.allowance,
            addressId: data.addressId,
            allocationTimestamp: allowanceItem.createMessageTimestamp,
            applicationTimestamp: allowanceItem.issueCreateTimestamp,
            clientName: data.clientName,
          }));
      })
      .flat()
      .sort((a, b) => a.allocationTimestamp - b.allocationTimestamp);
  }
}
