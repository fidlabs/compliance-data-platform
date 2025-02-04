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
  ApiExcludeController,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';

@Controller('client-report')
export class ClientReportController {
  constructor(private readonly clientReportsService: ClientReportService) {}

  @Get(':client')
  @ApiOperation({
    summary: 'Get list of client compliance reports',
  })
  @ApiOkResponse({
    description: 'List of client compliance reports',
    type: null,
  })
  async getClientReports(@Param('client') client: string) {
    return await this.clientReportsService.getReports(client);
  }

  @Get(':client/latest')
  @ApiOperation({
    summary: 'Get latest client compliance report',
  })
  @ApiOkResponse({
    description: 'Client compliance report',
    type: null,
  })
  async getClientReport(@Param('client') client: string) {
    const report = await this.clientReportsService.getLatestReport(client);

    if (!report) throw new NotFoundException();
    return report;
  }

  @Get(':client/:id')
  @ApiOperation({
    summary: 'Get client compliance report by id',
  })
  @ApiOkResponse({
    description: 'Client compliance report',
    type: null,
  })
  async getClientReportById(
    @Param('client') client: string,
    @Param('id') id: bigint,
  ) {
    const report = await this.clientReportsService.getReport(client, id);

    if (!report) throw new NotFoundException();
    return report;
  }

  @Post(':client')
  @ApiOperation({
    summary: 'Generate compliance report for a given client',
  })
  @ApiCreatedResponse({
    description: 'Client compliance report',
    type: null,
  })
  async generateClientReport(@Param('client') client: string) {
    const report = await this.clientReportsService.generateReport(client);

    if (!report) throw new NotFoundException();
    return report;
  }
}

// TODO remove me
@Controller('clientReport')
@ApiExcludeController()
export class ClientReportControllerRedirect extends ClientReportController {}
