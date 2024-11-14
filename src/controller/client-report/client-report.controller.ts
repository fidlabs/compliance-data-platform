import { Controller, Param, Post } from '@nestjs/common';
import { ClientReportService } from '../../service/client-report/client-report.service';

@Controller('clientReport')
export class ClientReportController {
  constructor(private readonly clientReportsService: ClientReportService) {}

  @Post(':client')
  async generateClientReport(@Param('client') client: string) {
    await this.clientReportsService.generateReport(client);
  }
}
