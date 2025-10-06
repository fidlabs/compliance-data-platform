import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Logger,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ClientReportService } from 'src/service/client-report/client-report.service';
import {
  ApiCreatedResponse,
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { GitHubTriggersHandlerService } from 'src/service/github-triggers-handler-service/github-triggers-handler.service';

@Controller('client-report')
export class ClientReportController {
  private readonly logger = new Logger(ClientReportController.name);

  constructor(
    private readonly clientReportsService: ClientReportService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly gitHubTriggersHandlerService: GitHubTriggersHandlerService,
  ) {}

  @Post('/gh-trigger')
  @ApiExcludeEndpoint()
  public async gitHubTrigger(@Body() body: any) {
    await this.gitHubTriggersHandlerService.handleTrigger(body);
  }

  @Get(':client')
  @ApiOperation({
    summary: 'Get list of client compliance reports',
  })
  @ApiOkResponse({
    description: 'List of client compliance reports',
    type: null,
  })
  public async getClientReports(@Param('client') client: string) {
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
  public async getClientReport(@Param('client') client: string) {
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
  public async getClientReportById(
    @Param('client') client: string,
    @Param(
      'id',
      new ParseIntPipe({
        errorHttpStatusCode: HttpStatus.NOT_FOUND,
      }),
    )
    id: bigint,
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
  public async generateClientReport(@Param('client') client: string) {
    const report = await this.clientReportsService.generateReport(client);
    if (!report) throw new NotFoundException();

    // invalidate the cache
    await this.cacheManager.del(`/client-report/${client}/latest`);
    await this.cacheManager.del(`/client-report/${client}`);

    return report;
  }
}
