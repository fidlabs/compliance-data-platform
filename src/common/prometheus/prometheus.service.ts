import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Gauge } from 'prom-client';
import { GaugeMetrics } from './metrics/gaugeMetrics';

export class PrometheusMetricService {
  constructor(
    @InjectMetric(GaugeMetrics.SUCCESS_CLIENT_REPORTS)
    private readonly successClientReports: Gauge<string>,
    @InjectMetric(GaugeMetrics.FAIL_CLIENT_REPORTS)
    private readonly failClientReports: Gauge<string>,
  ) {}

  public setSuccessClientReportsMetric = (value: number) =>
    this.successClientReports.set(value);

  public setFailClientReportsMetric = (value: number) =>
    this.failClientReports.set(value);
}
