import { Controller, Param, Post } from '@nestjs/common';
import { ClientReportService } from '../../service/client-report/client-report.service';

@Controller('clientReport')
export class ClientReportController {
  constructor(private readonly clientReportsService: ClientReportService) {}

  @Post(':client/:repo/:owner')
  async generateClientReport(
    @Param('client') client: string,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
  ) {
    await this.clientReportsService.generateReport(client, owner, repo);
  }
}
