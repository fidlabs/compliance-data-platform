import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrometheusModule as PrometheusModuleSource } from '@willsoto/nestjs-prometheus';
import { PrismaService } from 'src/db/prisma.service';
import { allocatorPrometheusMetrics } from './allocator-metrics/metrics';
import { clientPrometheusMetrics } from './client-metrics/metrics';
import { pgPoolPrometheusMetrics } from './db-metrics/metrics';
import { PrometheusMetricController } from './prometheus.controller';
import { PrometheusMetricService } from './prometheus.service';

@Module({
  imports: [
    PrometheusModuleSource.register({
      customMetricPrefix: 'cdp',
      defaultMetrics: {
        enabled: false,
      },
    }),
  ],
  controllers: [PrometheusMetricController],
  providers: [
    ...allocatorPrometheusMetrics,
    ...clientPrometheusMetrics,
    ...pgPoolPrometheusMetrics,
    PrometheusMetricService,
    PrismaService,
    ConfigService,
  ],
  exports: [PrometheusMetricService],
})
export class PrometheusMetricModule {}
