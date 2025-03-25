import { Controller, Get, Inject, Logger } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  HealthIndicator,
  HealthIndicatorResult,
  HttpHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { PostgresService } from 'src/db/postgres.service';
import { PostgresDmobService } from 'src/db/postgresDmob.service';
import { AggregationTasksService } from 'src/aggregation/aggregation-tasks.service';
import { ClientReportGeneratorJobService } from 'src/jobs/client-report-generator-job/client-report-generator-job.service';
import { ConfigService } from '@nestjs/config';
import { AllocatorReportGeneratorJobService } from 'src/jobs/allocator-report-generator-job/allocator-report-generator-job.service';
import { IpniAdvertisementFetcherJobService } from 'src/jobs/ipni-advertisement-fetcher-job/ipni-advertisement-fetcher-job.service';
import { Cache, CACHE_MANAGER, CacheTTL } from '@nestjs/cache-manager';
import { GitHubTriggersHandlerService } from 'src/service/github-triggers-handler-service/github-triggers-handler.service';
import { Cacheable } from 'src/utils/cacheable';

@Controller()
export class AppController extends HealthIndicator {
  private readonly logger = new Logger(AppController.name);
  private readonly appStartTime = new Date();
  private lastHealthcheckFailedTime: Date | null = null;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
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
  public async getDebug() {
    return 'debug';
  }

  @Get('health')
  @HealthCheck({ noCache: true })
  @CacheTTL(1) // disable cache
  public async getHealth(): Promise<HealthCheckResult> {
    try {
      return await this._getHealth();
    } catch (err) {
      this.lastHealthcheckFailedTime = new Date();
      throw err;
    }
  }

  private async _getHealthMetadata(): Promise<HealthIndicatorResult> {
    return this.getStatus('app', true, {
      appStartTime: this.appStartTime,
      lastHealthcheckFailedTime: this.lastHealthcheckFailedTime,
    });
  }

  // cache http ping checks for better performance
  @Cacheable({ ttl: 1000 * 60 * 10 }) // 10 minutes
  private async _httpPingCheck(
    name: string,
    url: string,
  ): Promise<HealthIndicatorResult> {
    return this.httpHealthIndicator.pingCheck(name, url);
  }

  // dedicated cache for ipinfo.io because of token limits
  @Cacheable({ ttl: 1000 * 60 * 60 }) // 1 hour
  private async _httpPingCheckIpInfo(): Promise<HealthIndicatorResult> {
    return await this.httpHealthIndicator.pingCheck(
      'ipinfo.io',
      `https://ipinfo.io/8.8.8.8?token=${this.configService.get<string>('IP_INFO_TOKEN')}`,
    );
  }

  @Cacheable({ ttl: 1000 * 10 }) // 10 seconds
  private async _getHealth(): Promise<HealthCheckResult> {
    // prettier-ignore
    return this.healthCheckService.check([
      () => this._getHealthMetadata(),
      () => this._httpPingCheckIpInfo(),
      () => this._httpPingCheck('cid.contact', 'https://cid.contact/health'),
      () => this._httpPingCheck('glif-api', `${this.configService.get<string>('GLIF_API_BASE_URL')}/v1`),
      () => this._httpPingCheck('allocator-tech-api', `${this.configService.get<string>('ALLOCATOR_TECH_BASE_URL')}/health`),
      () => this._httpPingCheck('stats.filspark.com', 'https://stats.filspark.com'),
      () => this.typeOrmHealthIndicator.pingCheck('database', {
          connection: this.postgresService.pool,
          timeout: 2000,
        }),
      () => this.typeOrmHealthIndicator.pingCheck('database-dmob', {
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
