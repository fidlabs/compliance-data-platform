import { Injectable } from '@nestjs/common';
import { DataCapStatsService } from '../datacapstats/datacapstats.service';
import { PrismaService } from '../../db/prisma.service';
import { DataCapStatsVerifierData } from '../datacapstats/types.verifiers.datacapstats';

@Injectable()
export class ComplianceReportService {
  constructor(
    private readonly dataCapStatsService: DataCapStatsService,
    private readonly prismaService: PrismaService,
  ) {}

  async generateReport(address: string) {
    const allocatorInfo = await this.getAllocatorInfo(address);
    await this.prismaService.compliance_report.create({
      data: {
        allocator: allocatorInfo.addressId,
        address: allocatorInfo.address,
        name: allocatorInfo.name,
        filecoin_pulse: `https://filecoinpulse.pages.dev/allocator/${allocatorInfo.addressId}`,
        multisig: allocatorInfo.isMultisig,
      },
    });
  }

  private async getAllocatorInfo(
    allocatorId: string,
  ): Promise<DataCapStatsVerifierData> {
    return await this.dataCapStatsService.getVerifiersData(allocatorId);
  }
}
