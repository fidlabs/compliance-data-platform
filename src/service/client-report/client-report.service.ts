import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { DataCapStatsService } from '../datacapstats/datacapstats.service';

@Injectable()
export class ClientReportService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly dataCapStatsService: DataCapStatsService,
  ) {}

  async generateReport(client: string) {
    const verifiedClientResponse =
      await this.dataCapStatsService.fetchClientDetails(client);

    const verifiedClientData =
      await this.dataCapStatsService.findPrimaryClientDetails(
        verifiedClientResponse.data,
      );

    await this.prismaService.client_report.create({
      data: {
        client: client,
        client_address: verifiedClientData.address,
        organization_name:
          (verifiedClientData.name ?? '') + (verifiedClientData.orgName ?? ''),
      },
    });
  }
}
