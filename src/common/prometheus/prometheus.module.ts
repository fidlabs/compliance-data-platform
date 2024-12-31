import { Module } from '@nestjs/common';
import { PrometheusModule as PrometheusModuleSource } from '@willsoto/nestjs-prometheus';
import { prometheusGauges } from './metrics/gaugeMetrics';
import { PrometheusMetricController } from './prometheus.controller';
import { PrometheusMetricService } from './prometheus.service';
import { prometheusHistograms } from './metrics/histogramMetrics';

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
    ...prometheusGauges,
    ...prometheusHistograms,
    PrometheusMetricService,
  ],
  exports: [PrometheusMetricService],
})
export class PrometheusMetricModule {}
