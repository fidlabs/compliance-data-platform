import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Gauge } from 'prom-client';
import { MetricsBase } from '../metrics-base';
import { ClientGaugeMetricsType } from './metrics';

@Injectable()
export class ClientReportGeneratorMetrics extends MetricsBase {
  constructor(
    @InjectMetric(ClientGaugeMetricsType.SUCCESS_CLIENT_REPORTS_COUNT)
    private readonly successReports: Gauge<string>,

    @InjectMetric(ClientGaugeMetricsType.FAIL_CLIENT_REPORTS_COUNT)
    private readonly failReports: Gauge<string>,
  ) {
    super();
  }

  public setSuccessReportsCountMetric = (value: number) =>
    this.successReports
      .labels({
        env: this.env,
      })
      .set(value);

  public setFailReportsCountMetric = (value: number) =>
    this.failReports
      .labels({
        env: this.env,
      })
      .set(value);
}
