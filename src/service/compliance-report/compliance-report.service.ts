import { Injectable } from '@nestjs/common';
import { DataCapStatsService } from '../datacapstats/datacapstats.service';
import { PrismaService } from '../../db/prisma.service';

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
      },
    });
  }
}
