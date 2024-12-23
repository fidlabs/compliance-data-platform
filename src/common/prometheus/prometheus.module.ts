import { Module } from '@nestjs/common';
import { PrometheusModule as PrometheusModuleSource } from '@willsoto/nestjs-prometheus';
import { prometheusGauges } from './metrics/gaugeMetrics';
import { PrometheusMetricController } from './prometheus.controller';
import { PrometheusMetricService } from './prometheus.service';

@Module({
  imports: [
    PrometheusModuleSource.register({
      controller: PrometheusMetricController,
      pushgateway: {
        url: process.env.PROMETHEUS_PUSH_GATEWAY ?? 'http://127.0.0.1:9091',
      },
      customMetricPrefix: 'cdp',
    }),
  ],
  providers: [...prometheusGauges, PrometheusMetricService],
  exports: [PrometheusMetricService],
})
export class PrometheusMetricModule {}
