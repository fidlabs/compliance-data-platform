import { Module } from '@nestjs/common';
import { PrometheusModule as PrometheusModuleSource } from '@willsoto/nestjs-prometheus';
import { allocatorPrometheusMetrics } from './allocator-metrics/metrics';
import { clientPrometheusMetrics } from './client-metrics/metrics';
import { PrometheusMetricController } from './prometheus.controller';
import { PrometheusMetricService } from './prometheus.service';

@Module({
  imports: [
    PrometheusModuleSource.register({
      controller: PrometheusMetricController,
      customMetricPrefix: 'cdp',
      defaultMetrics: {
        enabled: false,
      },
    }),
  ],
  providers: [
    ...allocatorPrometheusMetrics,
    ...clientPrometheusMetrics,
    PrometheusMetricService,
  ],
  exports: [PrometheusMetricService],
})
export class PrometheusMetricModule {}
