import { Controller, Get } from '@nestjs/common';
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

@Controller()
export class AppController {
  constructor(
    private healthCheckService: HealthCheckService,
    private httpHealthIndicator: HttpHealthIndicator,
    private typeOrmHealthIndicator: TypeOrmHealthIndicator,
    private postgresService: PostgresService,
    private postgresDmobService: PostgresDmobService,
    private aggregationTasksService: AggregationTasksService,
    private clientReportGeneratorJobService: ClientReportGeneratorJobService,
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
      () =>
        this.httpHealthIndicator.pingCheck(
          'api.datacapstats.io',
          'https://api.datacapstats.io/api/health',
        ),
      () =>
        this.httpHealthIndicator.pingCheck('ipinfo.io', 'https://ipinfo.io'),
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
    ]);
  }
}
