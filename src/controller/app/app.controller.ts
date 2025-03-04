import { Controller, Get, Logger } from '@nestjs/common';
import {
  HealthCheckService,
  HttpHealthIndicator,
  HealthCheck,
  TypeOrmHealthIndicator,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { PostgresService } from 'src/db/postgres.service';
import { PostgresDmobService } from 'src/db/postgresDmob.service';
import { AggregationTasksService } from 'src/aggregation/aggregation-tasks.service';
import { ClientReportGeneratorJobService } from 'src/jobs/client-report-generator-job/client-report-generator-job.service';
import { ConfigService } from '@nestjs/config';
import { AllocatorReportGeneratorJobService } from 'src/jobs/allocator-report-generator-job/allocator-report-generator-job.service';
import { IpniAdvertisementFetcherJobService } from 'src/jobs/ipni-advertisement-fetcher-job/ipni-advertisement-fetcher-job.service';
import { LocationService } from 'src/service/location/location.service';
import { CacheTTL } from '@nestjs/cache-manager';
import { GitHubTriggersHandlerService } from 'src/service/github-triggers-handler-service/github-triggers-handler.service';

@Controller()
export class AppController extends HealthIndicator {
  private readonly logger = new Logger(AppController.name);
  private readonly appStartTime = new Date();

  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly httpHealthIndicator: HttpHealthIndicator,
    private readonly typeOrmHealthIndicator: TypeOrmHealthIndicator,
    private readonly postgresService: PostgresService,
    private readonly postgresDmobService: PostgresDmobService,
    private readonly configService: ConfigService,
    private readonly aggregationTasksService: AggregationTasksService,
    private readonly clientReportGeneratorJobService: ClientReportGeneratorJobService,
    private readonly allocatorReportGeneratorJobService: AllocatorReportGeneratorJobService,
    private readonly ipniAdvertisementFetcherJobService: IpniAdvertisementFetcherJobService,
    private readonly locationService: LocationService,
    private readonly gitHubTriggersHandlerService: GitHubTriggersHandlerService,
  ) {
    super();
  }

  @Get()
  @ApiExcludeEndpoint()
  public getRoot(): string {
    return 'Compliance Data Platform API';
  }

  @Get('/debug')
  @CacheTTL(1) // disable cache
  @ApiExcludeEndpoint()
  async getDebug() {
    return 'debug';
  }

  private async _getHealth(): Promise<HealthIndicatorResult> {
    return this.getStatus('app', true, {
      appStartTime: this.appStartTime,
    });
  }

  @Get('health')
  @HealthCheck()
  @CacheTTL(1000 * 10) // 10 seconds
  public async getHealth() {
    this.logger.debug('Running healthcheck');

    return this.healthCheckService.check([
      () => this._getHealth(),
      () => this.locationService.getHealth(),
      () =>
        this.httpHealthIndicator.pingCheck(
          'cid.contact',
          'https://cid.contact/health',
        ),
      () =>
        this.httpHealthIndicator.pingCheck(
          'glif-api',
          `${this.configService.get<string>('GLIF_API_BASE_URL')}/v1`,
        ),
      () =>
        this.httpHealthIndicator.pingCheck(
          'allocator-tech-api',
          `${this.configService.get<string>('ALLOCATOR_TECH_BASE_URL')}/health`,
        ),
      () =>
        this.httpHealthIndicator.pingCheck(
          'api.datacapstats.io',
          'https://api.datacapstats.io/api/health',
        ),
      () =>
        this.httpHealthIndicator.pingCheck(
          'stats.filspark.com',
          'https://stats.filspark.com',
        ),
      () =>
        this.typeOrmHealthIndicator.pingCheck('database', {
          connection: this.postgresService.pool,
          timeout: 2000,
        }),
      () =>
        this.typeOrmHealthIndicator.pingCheck('database-dmob', {
          connection: this.postgresDmobService.pool,
          timeout: 2000,
        }),
      () => this.aggregationTasksService.getHealth(),
      () => this.clientReportGeneratorJobService.getHealth(),
      () => this.allocatorReportGeneratorJobService.getHealth(),
      () => this.ipniAdvertisementFetcherJobService.getHealth(),
      () => this.gitHubTriggersHandlerService.getHealth(),
    ]);
  }
}
