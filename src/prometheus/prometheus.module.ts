import { Module } from '@nestjs/common';
import { PrometheusModule as PrometheusModuleSource } from '@willsoto/nestjs-prometheus';
import { PrismaService } from 'src/db/prisma.service';
import { allocatorPrometheusMetrics } from './allocator-metrics/metrics';
import { clientPrometheusMetrics } from './client-metrics/metrics';
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
    PrometheusMetricService,
    PrismaService,
  ],
  exports: [PrometheusMetricService],
})
export class PrometheusMetricModule {}
