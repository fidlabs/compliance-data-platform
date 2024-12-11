import { Injectable } from '@nestjs/common';
import { DataCapStatsService } from '../datacapstats/datacapstats.service';
import { PrismaService } from '../../db/prisma.service';
import {
  Error,
  Industry,
  Region,
} from '../datacapstats/types.verified-clients.datacapstats';

@Injectable()
export class ComplianceReportService {
  constructor(
    private readonly dataCapStatsService: DataCapStatsService,
    private readonly prismaService: PrismaService,
  ) {}

  async generateReport(address: string) {
    const verifiersData =
      await this.dataCapStatsService.getVerifiersData(address);

    const verifierClients = await this.dataCapStatsService.getVerifierClients(
      verifiersData.addressId,
    );

    const clientsData = this.getGrantedDatacapInClients(verifierClients.data);

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
      },
    });
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
