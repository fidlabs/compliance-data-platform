import { Injectable } from '@nestjs/common';
import { DataCapStatsService } from '../datacapstats/datacapstats.service';
import { PrismaService } from '../../db/prisma.service';
import {
  Error,
  Industry,
  Region,
} from '../datacapstats/types.verified-clients.datacapstats';
import { StorageProviderService } from '../storage-provider/storage-provider.service';
import { ClientService } from '../client/client.service';
import { AllocatorTechService } from '../allocator-tech/allocator-tech.service';
import { groupBy } from 'lodash';

@Injectable()
export class AllocatorReportService {
  constructor(
    private readonly dataCapStatsService: DataCapStatsService,
    private readonly prismaService: PrismaService,
    private readonly storageProviderService: StorageProviderService,
    private readonly clientService: ClientService,
    private readonly allocatorTechService: AllocatorTechService,
  ) {}

  async generateReport(allocatorIdOrAddress: string) {
    const verifierData =
      await this.dataCapStatsService.getVerifierData(allocatorIdOrAddress);

    if (!verifierData) return null;

    const verifiedClients = await this.dataCapStatsService.getVerifiedClients(
      verifierData.addressId,
    );

    const allocatorInfo = await this.allocatorTechService.getAllocatorInfo(
      verifierData.address,
    );

    const clientsData = this.getGrantedDatacapInClients(verifiedClients.data);

    const storageProviderDistribution =
      await this.getStorageProviderDistribution(
        verifiedClients.data.map((client) => {
          return client.addressId;
        }),
      );

    return await this.prismaService.allocator_report.create({
      data: {
        allocator: verifierData.addressId,
        address: verifierData.address,
        name: verifierData.name || null,
        multisig: verifierData.isMultisig,
        avg_retrievability_success_rate:
          storageProviderDistribution.reduce(
            (acc, curr) => acc + curr.retrievability_success_rate,
            0,
          ) / storageProviderDistribution.length,
        clients_number: verifiedClients.data.length,
        data_types: allocatorInfo?.data_types,
        required_copies: allocatorInfo?.required_replicas,
        required_sps: allocatorInfo?.required_sps,
        clients: {
          create: verifiedClients.data.map((client) => {
            return {
              client_id: client.addressId,
              name: client.name || null,
              allocations_number: client.allowanceArray.length,
              application_url:
                this.clientService.getClientApplicationUrl(client),
              application_timestamp: client.allowanceArray?.[0]
                ?.issueCreateTimestamp
                ? new Date(client.allowanceArray[0].issueCreateTimestamp * 1000)
                : null,
              total_allocations: client.allowanceArray.reduce(
                (acc: number, curr: any) => acc + Number(curr.allowance),
                0,
              ),
            };
          }),
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
              provider: provider.provider,
              unique_data_size: provider.unique_data_size,
              total_deal_size: provider.total_deal_size,
              perc_of_total_datacap: provider.perc_of_total_datacap,
              retrievability_success_rate: provider.retrievability_success_rate,
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

  async getReports(allocatorId: string) {
    return await this.prismaService.allocator_report.findMany({
      where: {
        allocator: allocatorId,
      },
      orderBy: {
        create_date: 'desc',
      },
    });
  }

  async getLatestReport(allocatorId: string) {
    return this.getReport(allocatorId);
  }

  async getReport(allocatorId: string, id?: string) {
    const report = await this.prismaService.allocator_report.findFirst({
      where: {
        allocator: allocatorId,
        id: id || undefined,
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
      },
      orderBy: {
        create_date: 'desc',
      },
    });

    return {
      ...report,
      client_allocations: groupBy(
        report.client_allocations,
        (c) => c.client_id,
      ),
    };
  }

  private getGrantedDatacapInClients(
    data: {
      id: number;
      addressId: string;
      address: string;
      retries: number;
      auditTrail: string;
      name: string;
      orgName: string;
      initialAllowance: string;
      allowance: string;
      verifierAddressId: string;
      createdAtHeight: number;
      issueCreateTimestamp: null;
      createMessageTimestamp: number;
      verifierName: string;
      dealCount: number | null;
      providerCount: number | null;
      topProvider: string | null;
      receivedDatacapChange: string;
      usedDatacapChange: string;
      allowanceArray: {
        id: number;
        error: Error;
        height: number;
        msgCID: string;
        retries: number;
        addressId: string;
        allowance: number;
        auditTrail: string;
        allowanceTTD: number;
        isDataPublic: string;
        issueCreator: string;
        providerList: any[];
        usedAllowance: string;
        isLdnAllowance: boolean;
        isEFilAllowance: boolean;
        verifierAddressId: string;
        isFromAutoverifier: boolean;
        retrievalFrequency: string;
        searchedByProposal: boolean;
        issueCreateTimestamp: number;
        hasRemainingAllowance: boolean;
        createMessageTimestamp: number;
      }[];
      region: Region;
      website: string;
      industry: Industry;
      usedDatacap: string;
      remainingDatacap: string;
    }[],
  ) {
    const ClientsData = data.map((e) => ({
      addressId: e.addressId,
      allowanceArray: e.allowanceArray,
      clientName: e.name,
    }));

    return ClientsData.map((item) => {
      return item.allowanceArray.map((allowanceItem) => ({
        allocation: allowanceItem.allowance,
        addressId: item.addressId,
        allocationTimestamp: allowanceItem.createMessageTimestamp,
        applicationTimestamp: allowanceItem.issueCreateTimestamp,
        clientName: item.clientName,
      }));
    })
      .flat()
      .sort((a, b) => a.allocationTimestamp - b.allocationTimestamp);
  }
}
