import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ClientReportService } from '../../service/client-report/client-report.service';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';

@Controller('clientReport')
export class ClientReportController {
  constructor(private readonly clientReportsService: ClientReportService) {}

  @Get(':client')
  @ApiOperation({
    summary: 'Get list of client reports',
  })
  @ApiOkResponse({
    description: 'List of client reports',
    type: null,
  })
  async getClientReports(@Param('client') client: string) {
    return await this.clientReportsService.getClientReports(client);
  }

  @Get(':client/latest')
  @ApiOperation({
    summary: 'Get latest client report',
  })
  @ApiOkResponse({
    description: 'Client report',
    type: null,
  })
  async getClientReport(@Param('client') client: string) {
    const report =
      await this.clientReportsService.getClientLatestReport(client);
    if (!report) throw new NotFoundException();

    return report;
  }

  @Get(':client/:id')
  @ApiOperation({
    summary: 'Get client report by id',
  })
  @ApiOkResponse({
    description: 'Client report',
    type: null,
  })
  async getClientReportById(
    @Param('client') client: string,
    @Param('id') id: bigint,
  ) {
    const report = await this.clientReportsService.getClientReport(client, id);
    if (!report) throw new NotFoundException();

    return report;
  }

  @Post(':client')
  @ApiOperation({
    summary: 'Generate report for a given client',
  })
  @ApiCreatedResponse({
    description: 'Client report',
    type: null,
  })
  async generateClientReport(@Param('client') client: string) {
    const report = await this.clientReportsService.generateReport(client);
    if (!report) throw new NotFoundException();

    return report;
  }
}
