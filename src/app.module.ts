import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AggregationTasksService } from './aggregation/aggregation-tasks.service';
import { AggregationService } from './aggregation/aggregation.service';
import { PrismaService } from './db/prisma.service';
import { PrismaDmobService } from './db/prismaDmob.service';

import { AllocatorsRunner } from './aggregation/runners/allocators.runner';
import { CidSharingRunner } from './aggregation/runners/cid-sharing.runner';
import { ClientAllocatorDistributionRunner } from './aggregation/runners/client-allocator-distribution.runner';
import { ClientClaimsRunner } from './aggregation/runners/client-claims.runner';
import { ClientProviderDistributionRunner } from './aggregation/runners/client-provider-distribution.runner';
import { ClientReplicaDistributionRunner } from './aggregation/runners/client-replica-distribution.runner';
import { ProviderFirstClientRunner } from './aggregation/runners/provider-first-client.runner';
import { ProviderRetrievabilityRunner } from './aggregation/runners/provider-retrievability.runner';
import { ProvidersRunner } from './aggregation/runners/providers.runner';
import { UnifiedVerifiedDealRunner } from './aggregation/runners/unified-verified-deal.runner';
import { HttpModule } from '@nestjs/axios';
import { FilSparkService } from './filspark/filspark.service';
import { ProviderRetrievabilityBackfillRunner } from './aggregation/runners/provider-retrievability-backfill.runner';
import { ProvidersController } from './controller/stats/providers/providers.controller';
import { ProviderService } from './service/provider/provider.service';
import { AllocatorsController } from './controller/stats/allocators/allocators.controller';
import { AllocatorService } from './service/allocator/allocator.service';
import { HistogramHelper } from './helper/histogram.helper';
import { AllocatorsAccRunner } from './aggregation/runners/allocators-acc.runner';
import { ClientAllocatorDistributionAccRunner } from './aggregation/runners/client-allocator-distribution-acc.runner';
import { ClientProviderDistributionAccRunner } from './aggregation/runners/client-provider-distribution-acc.runner';
import { ProvidersAccRunner } from './aggregation/runners/providers-acc.runner';
import { ProvidersAccController } from './controller/stats/accumulative/providers/providers.controller';
import { AllocatorsAccController } from './controller/stats/accumulative/allocators/allocators.controller';
import { PostgresService } from './db/postgres.service';
import { PostgresDmobService } from './db/postgresDmob.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    HttpModule.register({ timeout: 5000 }),
  ],
  controllers: [
    ProvidersController,
    AllocatorsController,
    ProvidersAccController,
    AllocatorsAccController,
  ],
  providers: [
    AggregationService,
    AggregationTasksService,
    PrismaService,
    PrismaDmobService,
    FilSparkService,
    AllocatorsRunner,
    AllocatorsAccRunner,
    CidSharingRunner,
    ClientAllocatorDistributionRunner,
    ClientAllocatorDistributionAccRunner,
    ClientClaimsRunner,
    ClientProviderDistributionRunner,
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
  ],
})
export class AppModule {}
