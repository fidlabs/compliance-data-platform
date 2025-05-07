import { HttpModule } from '@nestjs/axios';
import { CacheModule, CacheInterceptor } from '@nestjs/cache-manager';
import { APP_FILTER } from '@nestjs/core';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AggregationTasksService } from './aggregation/aggregation-tasks.service';
import { AggregationService } from './aggregation/aggregation.service';
import { AllocatorClientBookkeepingRunner } from './aggregation/runners/allocator-client-bookkeeping.runner';
import { AllocatorRegistryRunner } from './aggregation/runners/allocator-registry.runner';
import { AllocatorsWeeklyAccRunner } from './aggregation/runners/allocators-weekly-acc.runner';
import { AllocatorsWeeklyRunner } from './aggregation/runners/allocators-weekly.runner';
import { CidSharingRunner } from './aggregation/runners/cid-sharing.runner';
import { ClientAllocatorDistributionWeeklyAccRunner } from './aggregation/runners/client-allocator-distribution-weekly-acc.runner';
import { ClientAllocatorDistributionWeeklyRunner } from './aggregation/runners/client-allocator-distribution-weekly.runner';
import { ClientClaimsHourlyRunner } from './aggregation/runners/client-claims-hourly.runner';
import { ClientProviderDistributionAccRunner } from './aggregation/runners/client-provider-distribution-acc.runner';
import { ClientProviderDistributionWeeklyRunner } from './aggregation/runners/client-provider-distribution-weekly.runner';
import { ClientReplicaDistributionRunner } from './aggregation/runners/client-replica-distribution.runner';
import { IpniReportingDailyRunner } from './aggregation/runners/ipni-reporting-daily.runner';
import { OldDatacapBalanceNv22Runner } from './aggregation/runners/old-datacap-balance-nv22.runner';
import { OldDatacapBalanceWeeklyRunner } from './aggregation/runners/old-datacap-balance-weekly.runner';
import { OldDatacapClientBalanceNv22Runner } from './aggregation/runners/old-datacap-client-balance-nv22.runner';
import { OldDatacapClientBalanceWeeklyRunner } from './aggregation/runners/old-datacap-client-balance-weekly.runner';
import { ProviderFirstClientRunner } from './aggregation/runners/provider-first-client.runner';
import { ProviderIpInfoRunner } from './aggregation/runners/provider-ip-info.runner';
import { ProviderRetrievabilityDailyBackfillRunner } from './aggregation/runners/provider-retrievability-daily-backfill.runner';
import { ProviderRetrievabilityDailyRunner } from './aggregation/runners/provider-retrievability-daily.runner';
import { ProvidersWeeklyAccRunner } from './aggregation/runners/providers-weekly-acc.runner';
import { ProvidersWeeklyRunner } from './aggregation/runners/providers-weekly.runner';
import { UnifiedVerifiedDealHourlyRunner } from './aggregation/runners/unified-verified-deal-hourly.runner';
import { ClientReportController } from './controller/client-report/client-report.controller';
import { GoogleApisController } from './controller/proxy/googleapis.controller';
import {
  AllocatorsAccStatsController,
  AllocatorsStatsController,
} from './controller/stats/allocators/allocators-stats.controller';
import {
  StorageProvidersAccStatsController,
  StorageProvidersStatsController,
} from './controller/stats/storage-providers/storage-providers-stats.controller';
import { OldDatacapController } from './controller/stats/old-datacap/old-datacap.controller';
import { StorageProvidersController } from './controller/storage-providers/storage-providers.controller';
import { PostgresService } from './db/postgres.service';
import { PostgresDmobService } from './db/postgresDmob.service';
import { PrismaService } from './db/prisma.service';
import { PrismaDmobService } from './db/prismaDmob.service';
import { FilSparkService } from './service/filspark/filspark.service';
import { AllocatorService } from './service/allocator/allocator.service';
import { ClientReportService } from './service/client-report/client-report.service';
import { GoogleApisService } from './service/googleapis/googleapis.service';
import { EthApiService } from './service/eth-api/eth-api.service';
import { LotusApiService } from './service/lotus-api/lotus-api.service';
import { LocationService } from './service/location/location.service';
import { OldDatacapService } from './service/old-datacap/old-datacap.service';
import { ClientReportGeneratorJobService } from './jobs/client-report-generator-job/client-report-generator-job.service';
import { ClientProviderDistributionRunner } from './aggregation/runners/client-provider-distribution.runner';
import { RequestLoggerMiddleware } from './middleware/request-logger.middleware';
import { ClientReportChecksService } from './service/client-report-checks/client-report-checks.service';
import { ErrorHandlerMiddleware } from './middleware/error-handler.middleware';
import { AppController } from './controller/app/app.controller';
import { TerminusModule } from '@nestjs/terminus';
import { AllocatorReportService } from './service/allocator-report/allocator-report.service';
import { AllocatorReportController } from './controller/allocator-report/allocator-report.controller';
import { StorageProviderReportService } from './service/storage-provider-report/storage-provider-report.service';
import { StorageProviderService } from './service/storage-provider/storage-provider.service';
import { PrometheusMetricModule } from './prometheus';
import { ClientService } from './service/client/client.service';
import { AllocatorReportGeneratorJobService } from './jobs/allocator-report-generator-job/allocator-report-generator-job.service';
import { CidContactService } from './service/cid-contact/cid-contact.service';
import { IpniAdvertisementFetcherJobService } from './jobs/ipni-advertisement-fetcher-job/ipni-advertisement-fetcher-job.service';
import { IpniMisreportingCheckerService } from './service/ipni-misreporting-checker/ipni-misreporting-checker.service';
import { HttpService } from '@nestjs/axios';
import axiosBetterStacktrace from 'axios-better-stacktrace';
import axios from 'axios';
import { HistogramHelperService } from './service/histogram-helper/histogram-helper.service';
import { GitHubIssueParserService } from './service/github-issue-parser/github-issue-parser.service';
import { GitHubTriggersHandlerService } from './service/github-triggers-handler-service/github-triggers-handler.service';
import { GitHubAllocatorClientBookkeepingService } from './service/github-allocator-client-bookkeeping/github-allocator-client-bookkeeping.service';
import { GitHubAllocatorRegistryService } from './service/github-allocator-registry/github-allocator-registry.service';
import { AllocatorRunner } from './aggregation/runners/allocator.runner';
import { AllocatorReportChecksService } from './service/allocator-report-checks/allocator-report-checks.service';
import { AllocatorsController } from './controller/allocators/allocators.controller';
import { ProviderRunner } from './aggregation/runners/provider.runner';

const AGGREGATION_RUNNERS = [
  AllocatorClientBookkeepingRunner,
  AllocatorRegistryRunner,
  AllocatorRunner,
  ProviderRunner,
  AllocatorsWeeklyRunner,
  AllocatorsWeeklyAccRunner,
  CidSharingRunner,
  ClientAllocatorDistributionWeeklyRunner,
  ClientAllocatorDistributionWeeklyAccRunner,
  ClientClaimsHourlyRunner,
  ClientProviderDistributionRunner,
  ClientProviderDistributionWeeklyRunner,
  ClientProviderDistributionAccRunner,
  ClientReplicaDistributionRunner,
  IpniReportingDailyRunner,
  OldDatacapBalanceNv22Runner,
  OldDatacapBalanceWeeklyRunner,
  OldDatacapClientBalanceNv22Runner,
  OldDatacapClientBalanceWeeklyRunner,
  ProviderFirstClientRunner,
  ProviderIpInfoRunner,
  ProviderRetrievabilityDailyRunner,
  ProviderRetrievabilityDailyBackfillRunner,
  ProvidersWeeklyRunner,
  ProvidersWeeklyAccRunner,
  UnifiedVerifiedDealHourlyRunner,
];

@Module({
  imports: [
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    HttpModule.register({ timeout: 5000 }), // 5 seconds
    CacheModule.register({ ttl: 1000 * 60, max: 100000 }), // 1 minute
    TerminusModule.forRoot(),
    PrometheusMetricModule,
  ],
  controllers: [
    StorageProvidersStatsController,
    AllocatorsStatsController,
    AllocatorsController,
    StorageProvidersAccStatsController,
    AllocatorsAccStatsController,
    GoogleApisController,
    ClientReportController,
    AllocatorReportController,
    OldDatacapController,
    StorageProvidersController,
    AppController,
  ],
  providers: [
    ...AGGREGATION_RUNNERS,
    AggregationService,
    AggregationTasksService,
    ClientReportGeneratorJobService,
    IpniAdvertisementFetcherJobService,
    CidContactService,
    AllocatorReportGeneratorJobService,
    PrismaService,
    PrismaDmobService,
    FilSparkService,
    StorageProviderService,
    AllocatorService,
    PostgresService,
    PostgresDmobService,
    HistogramHelperService,
    GoogleApisService,
    IpniMisreportingCheckerService,
    ClientReportService,
    ClientService,
    GitHubIssueParserService,
    GitHubTriggersHandlerService,
    GitHubAllocatorClientBookkeepingService,
    GitHubAllocatorRegistryService,
    EthApiService,
    LotusApiService,
    LocationService,
    ClientReportChecksService,
    AllocatorReportService,
    AllocatorReportChecksService,
    StorageProviderReportService,
    OldDatacapService,
    { provide: APP_FILTER, useClass: ErrorHandlerMiddleware },
    { provide: APP_INTERCEPTOR, useClass: CacheInterceptor },
    {
      provide: 'AXIOS_INSTANCE',
      useFactory: () => {
        const axiosInstance = axios.create();
        axiosBetterStacktrace(axiosInstance);
        return axiosInstance;
      },
    },
    {
      provide: 'AggregationRunner',
      useFactory: (...runners) => runners,
      inject: AGGREGATION_RUNNERS,
    },
  ],
})
export class AppModule implements NestModule {
  constructor(private readonly httpService: HttpService) {
    axiosBetterStacktrace(this.httpService.axiosRef);
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
