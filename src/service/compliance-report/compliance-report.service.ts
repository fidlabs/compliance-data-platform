import { Injectable } from '@nestjs/common';
import { DataCapStatsService } from '../datacapstats/datacapstats.service';
import { PrismaService } from '../../db/prisma.service';
import {
  Error,
  Industry,
  Region,
} from '../datacapstats/types.verified-clients.datacapstats';
import { StorageProviderService } from '../storage-provider/storage-provider.service';

@Injectable()
export class ComplianceReportService {
  constructor(
    private readonly dataCapStatsService: DataCapStatsService,
    private readonly prismaService: PrismaService,
    private readonly storageProviderService: StorageProviderService,
  ) {}

  async generateReport(address: string) {
    const verifiersData =
      await this.dataCapStatsService.getVerifiersData(address);

    const verifierClients = await this.dataCapStatsService.getVerifierClients(
      verifiersData.addressId,
    );

    const clientsData = this.getGrantedDatacapInClients(verifierClients.data);

    const clientIds = verifierClients.data.map((client) => {
      return client.addressId;
    });

    const storageProviderDistribution =
      await this.getStorageProviderDistribution(clientIds);

    await this.prismaService.compliance_report.create({
      data: {
        allocator: verifiersData.addressId,
        address: verifiersData.address,
        name: verifiersData.name,
        filecoin_pulse: `https://filecoinpulse.pages.dev/allocator/${verifiersData.addressId}`,
        multisig: verifiersData.isMultisig,
        clients: {
          create: verifierClients.data.map((verifierClient) => {
            return {
              client_id: verifierClient.addressId,
              name: verifierClient.name,
              allocations_number: verifierClient.allowanceArray.length,
              total_allocations: verifierClient.allowanceArray.reduce(
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
      },
    });
  }

  private async getStorageProviderDistribution(clientIds: string[]) {
    const storageProviderDistribution = [];
    for (const clientId of clientIds) {
      storageProviderDistribution.push(
        ...(await this.storageProviderService.getStorageProviderDistributionWithLocation(
          clientId,
        )),
      );
    }
    return storageProviderDistribution;
  }

  private getGrantedDatacapInClients(
    data: {
      id: number;
      addressId: string;
      address: string;
      retries: number;
      auditTrail: 'n/a';
      name: string;
      orgName: string;
      initialAllowance: string;
      allowance: string;
      verifierAddressId: 'f03015751';
      createdAtHeight: number;
      issueCreateTimestamp: null;
      createMessageTimestamp: number;
      verifierName: 'Public Open Dataset Pathway';
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
        verifierAddressId: 'f03015751';
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
        clientName: item.clientName,
      }));
    })
      .flat()
      .sort((a, b) => a.allocationTimestamp - b.allocationTimestamp);
  }
}
