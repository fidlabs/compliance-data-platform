import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Gauge } from 'prom-client';
import { ClientGaugeMetricsType } from './metrics';

export class ClientMetrics {
  constructor(
    @InjectMetric(ClientGaugeMetricsType.SUCCESS_CLIENT_REPORTS_COUNT)
    private readonly successReports: Gauge<string>,

    @InjectMetric(ClientGaugeMetricsType.FAIL_CLIENT_REPORTS_COUNT)
    private readonly failReports: Gauge<string>,
  ) {}

  public setSuccessReportsCountMetric = (value: number) =>
    this.successReports.set(value);

  public setFailReportsCountMetric = (value: number) =>
    this.failReports.set(value);
}
