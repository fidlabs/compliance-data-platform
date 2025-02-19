import {
  Body,
  Controller,
  Get,
  Inject,
  Logger,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ClientReportService } from 'src/service/client-report/client-report.service';
import {
  ApiCreatedResponse,
  ApiExcludeController,
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { CACHE_MANAGER, CacheKey, Cache } from '@nestjs/cache-manager';
import { GithubTriggersHandlerService } from 'src/service/github-triggers-handler-service/github-triggers-handler.service';

@Controller('client-report')
export class ClientReportController {
  private readonly logger = new Logger(ClientReportController.name);

  constructor(
    private readonly clientReportsService: ClientReportService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly githubTriggersHandlerService: GithubTriggersHandlerService,
  ) {}

  @Post('/gh-trigger')
  @ApiExcludeEndpoint()
  public async gitHubTrigger(@Body() body: any) {
    await this.githubTriggersHandlerService.handleTrigger(body);
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
  @CacheKey('client-report-latest')
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
  public async generateClientReport(@Param('client') client: string) {
    const report = await this.clientReportsService.generateReport(client);
    if (!report) throw new NotFoundException();

    // invalidate the cache for the latest report
    await this.cacheManager.del('client-report-latest');

    return report;
  }
}

// TODO remove me
@Controller('clientReport')
@ApiExcludeController()
export class ClientReportControllerRedirect extends ClientReportController {}
