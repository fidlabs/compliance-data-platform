import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AggregationTasksService } from './aggregation/aggregation-tasks.service';
import { AggregationService } from './aggregation/aggregation.service';
import { PrismaService } from './db/prisma.service';
import { PrismaDmobService } from './db/prismaDmob.service';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_FILTER } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { AllocatorsAccRunner } from './aggregation/runners/allocators-acc.runner';
import { AllocatorsRunner } from './aggregation/runners/allocators.runner';
import { CidSharingRunner } from './aggregation/runners/cid-sharing.runner';
import { ClientAllocatorDistributionAccRunner } from './aggregation/runners/client-allocator-distribution-acc.runner';
import { ClientAllocatorDistributionRunner } from './aggregation/runners/client-allocator-distribution.runner';
import { ClientClaimsRunner } from './aggregation/runners/client-claims.runner';
import { ClientProviderDistributionAccRunner } from './aggregation/runners/client-provider-distribution-acc.runner';
import { ClientProviderDistributionWeeklyRunner } from './aggregation/runners/client-provider-distribution-weekly.runner';
import { ClientProviderDistributionRunner } from './aggregation/runners/client-provider-distribution.runner';
import { ClientReplicaDistributionRunner } from './aggregation/runners/client-replica-distribution.runner';
import { ProviderFirstClientRunner } from './aggregation/runners/provider-first-client.runner';
import { ProviderRetrievabilityBackfillRunner } from './aggregation/runners/provider-retrievability-backfill.runner';
import { ProviderRetrievabilityRunner } from './aggregation/runners/provider-retrievability.runner';
import { ProvidersAccRunner } from './aggregation/runners/providers-acc.runner';
import { ProvidersRunner } from './aggregation/runners/providers.runner';
import { UnifiedVerifiedDealRunner } from './aggregation/runners/unified-verified-deal.runner';
import { AppController } from './controller/app/app.controller';
import { ClientReportController } from './controller/client-report/client-report.controller';
import { GoogleApisController } from './controller/proxy/googleapis.controller';
import { AllocatorsAccController } from './controller/stats/accumulative/allocators/allocators.controller';
import { ProvidersAccController } from './controller/stats/accumulative/providers/providers.controller';
import { AllocatorsController } from './controller/stats/allocators/allocators.controller';
import { ProvidersController } from './controller/stats/providers/providers.controller';
import { PostgresService } from './db/postgres.service';
import { PostgresDmobService } from './db/postgresDmob.service';
import { FilSparkService } from './filspark/filspark.service';
import { HistogramHelper } from './helper/histogram.helper';
import { ClientReportGeneratorJobService } from './jobs/client-report-generator-job/client-report-generator-job.service';
import { ErrorHandlerMiddleware } from './middleware/error-handler.middleware';
import { RequestLoggerMiddleware } from './middleware/request-logger.middleware';
import { AllocatorTechService } from './service/allocator-tech/allocator-tech.service';
import { AllocatorService } from './service/allocator/allocator.service';
import { ClientReportChecksService } from './service/client-report-checks/client-report-checks.service';
import { ClientReportService } from './service/client-report/client-report.service';
import { DataCapStatsService } from './service/datacapstats/datacapstats.service';
import { GoogleApisService } from './service/googleapis/googleapis.service';
import { LocationService } from './service/location/location.service';
import { LotusApiService } from './service/lotus-api/lotus-api.service';
import { ProviderService } from './service/provider/provider.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    HttpModule.register({ timeout: 5000 }),
    CacheModule.register(),
    TerminusModule.forRoot(),
    // PrometheusModule.register({
    //   pushgateway: {
    //     url: process.env.PROMETHEUS_PUSH_GATEWAY ?? 'http://127.0.0.1:9091',
    //   },
    // }),
  ],
  controllers: [
    ProvidersController,
    AllocatorsController,
    ProvidersAccController,
    AllocatorsAccController,
    GoogleApisController,
    ClientReportController,
    AppController,
  ],
  providers: [
    AggregationService,
    AggregationTasksService,
    ClientReportGeneratorJobService,
    PrismaService,
    PrismaDmobService,
    FilSparkService,
    DataCapStatsService,
    AllocatorsRunner,
    AllocatorsAccRunner,
    CidSharingRunner,
    ClientAllocatorDistributionRunner,
    ClientAllocatorDistributionAccRunner,
    ClientClaimsRunner,
    ClientProviderDistributionRunner,
    ClientProviderDistributionWeeklyRunner,
    ClientProviderDistributionAccRunner,
    ClientReplicaDistributionRunner,
    ProviderFirstClientRunner,
    ProviderRetrievabilityRunner,
    ProviderRetrievabilityBackfillRunner,
    ProvidersRunner,
    ProvidersAccRunner,
    UnifiedVerifiedDealRunner,
    ProviderService,
    AllocatorService,
    PostgresService,
    PostgresDmobService,
    HistogramHelper,
    GoogleApisService,
    ClientReportService,
    LotusApiService,
    LocationService,
    AllocatorTechService,
    ClientReportChecksService,
    { provide: APP_FILTER, useClass: ErrorHandlerMiddleware },
    {
      provide: 'AggregationRunner',
      useFactory: (
        allocatorsRunner,
        allocatorsAccRunner,
        cidSharingRunner,
        clientAllocatorDistributionRunner,
        clientAllocatorDistributionAccRunner,
        clientClaimsRunner,
        clientProviderDistributionRunner,
        clientProviderDistributionWeeklyRunner,
        clientProviderDistributionAccRunner,
        clientReplicaDistributionRunner,
        providerFirstClientRunner,
        providerRetrievabilityRunner,
        providerRetrievabilityBackfillRunner,
        providersRunner,
        providersAccRunner,
        unifiedVerifiedDealRunner,
      ) => [
        allocatorsRunner,
        allocatorsAccRunner,
        cidSharingRunner,
        clientAllocatorDistributionRunner,
        clientAllocatorDistributionAccRunner,
        clientClaimsRunner,
        clientProviderDistributionRunner,
        clientProviderDistributionWeeklyRunner,
        clientProviderDistributionAccRunner,
        clientReplicaDistributionRunner,
        providerFirstClientRunner,
        providerRetrievabilityRunner,
        providerRetrievabilityBackfillRunner,
        providersRunner,
        providersAccRunner,
        unifiedVerifiedDealRunner,
      ],
      inject: [
        AllocatorsRunner,
        AllocatorsAccRunner,
        CidSharingRunner,
        ClientAllocatorDistributionRunner,
        ClientAllocatorDistributionAccRunner,
        ClientClaimsRunner,
        ClientProviderDistributionRunner,
        ClientProviderDistributionWeeklyRunner,
        ClientProviderDistributionAccRunner,
        ClientReplicaDistributionRunner,
        ProviderFirstClientRunner,
        ProviderRetrievabilityRunner,
        ProviderRetrievabilityBackfillRunner,
        ProvidersRunner,
        ProvidersAccRunner,
        UnifiedVerifiedDealRunner,
      ],
    },
    // makeGaugeProvider({
    //   name: 'success_client_reports',
    //   help: 'Total number of SUCCESS client reports',
    // }),
    // makeGaugeProvider({
    //   name: 'fail_client_reports',
    //   help: 'Total number of FAIL client reports',
    // }),
    ,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
