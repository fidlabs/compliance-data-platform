import { Controller, Get, Logger } from '@nestjs/common';
import {
  HealthCheckService,
  HttpHealthIndicator,
  HealthCheck,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { PostgresService } from '../../db/postgres.service';
import { PostgresDmobService } from '../../db/postgresDmob.service';
import { AggregationTasksService } from '../../aggregation/aggregation-tasks.service';
import { ClientReportGeneratorJobService } from '../../jobs/client-report-generator-job/client-report-generator-job.service';
import { ConfigService } from '@nestjs/config';
import { AllocatorReportGeneratorJobService } from '../../jobs/allocator-report-generator-job/allocator-report-generator-job.service';
import { IpniAdvertisementFetcherJobService } from '../../jobs/ipni-advertisement-fetcher-job/ipni-advertisement-fetcher-job.service';
import { LocationService } from '../../service/location/location.service';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private healthCheckService: HealthCheckService,
    private httpHealthIndicator: HttpHealthIndicator,
    private typeOrmHealthIndicator: TypeOrmHealthIndicator,
    private postgresService: PostgresService,
    private postgresDmobService: PostgresDmobService,
    private configService: ConfigService,
    private aggregationTasksService: AggregationTasksService,
    private clientReportGeneratorJobService: ClientReportGeneratorJobService,
    private allocatorReportGeneratorJobService: AllocatorReportGeneratorJobService,
    private ipniAdvertisementFetcherJobService: IpniAdvertisementFetcherJobService,
    private locationService: LocationService,
  ) {}

  @Get()
  @ApiExcludeEndpoint()
  getRoot(): string {
    return 'Compliance Data Platform API';
  }

  @Get('health')
  @HealthCheck()
  getHealth() {
    return this.healthCheckService.check([
      () => this.locationService.isHealthy(),
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
        }),
      () =>
        this.typeOrmHealthIndicator.pingCheck('database-dmob', {
          connection: this.postgresDmobService.pool,
        }),
      () => this.aggregationTasksService.isHealthy(),
      () => this.clientReportGeneratorJobService.isHealthy(),
      () => this.allocatorReportGeneratorJobService.isHealthy(),
      () => this.ipniAdvertisementFetcherJobService.isHealthy(),
    ]);
  }
}
