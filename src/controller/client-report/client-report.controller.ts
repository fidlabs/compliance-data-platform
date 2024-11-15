import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ClientReportService } from '../../service/client-report/client-report.service';

@Controller('clientReport')
export class ClientReportController {
  constructor(private readonly clientReportsService: ClientReportService) {}

  @Get(':client')
  async getClientReports(@Param('client') client: string) {
    return await this.clientReportsService.getClientReports(client);
  }

  @Get(':client/latest')
  async getClientReport(@Param('client') client: string) {
    return await this.clientReportsService.getClientLatestReport(client);
  }

  @Get(':client/:id')
  async getClientReportById(
    @Param('client') client: string,
    @Param('id') id: bigint,
  ) {
    const report = await this.clientReportsService.getClientReport(client, id);
    if (!report) throw new NotFoundException();

    return report;
  }

  @Post(':client')
  async generateClientReport(@Param('client') client: string) {
    await this.clientReportsService.generateReport(client);
  }
}
