import { Module } from '@nestjs/common';
import { PrometheusModule as PrometheusModuleSource } from '@willsoto/nestjs-prometheus';
import { PrismaService } from 'src/db/prisma.service';
import { AggregateMetrics } from './aggregate-metrics';
import { aggregatePrometheusMetrics } from './aggregate-metrics/metrics';
import { AllocatorReportGeneratorMetrics } from './allocator-metrics';
import { allocatorPrometheusMetrics } from './allocator-metrics/metrics';
import { ClientReportGeneratorMetrics } from './client-metrics';
import { clientPrometheusMetrics } from './client-metrics/metrics';
import { PgPoolMetrics } from './db-metrics';
import { pgPoolPrometheusMetrics } from './db-metrics/metrics';
import { PrometheusCustomMetricController } from './prometheus-custom.controller';
import { PrometheusMetricController } from './prometheus.controller';
import { PrometheusMetricService } from './prometheus.service';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    PrometheusModuleSource.register({
      customMetricPrefix: 'cdp',
      controller: PrometheusCustomMetricController,
      defaultMetrics: {
        enabled: false,
      },
    }),
  ],
  controllers: [PrometheusMetricController],
  providers: [
    ...allocatorPrometheusMetrics,
    ...clientPrometheusMetrics,
    ...aggregatePrometheusMetrics,
    ...pgPoolPrometheusMetrics,
    PrometheusMetricService,
    PrismaService,
    ClientReportGeneratorMetrics,
    AllocatorReportGeneratorMetrics,
    PgPoolMetrics,
    AggregateMetrics,
    ConfigService,
  ],
  exports: [PrometheusMetricService],
})
export class PrometheusMetricModule {}
