import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Gauge } from 'prom-client';
import { MetricsBase } from '../metrics-base';
import { AllocatorGaugeMetricsType } from './metrics';

@Injectable()
export class AllocatorReportGeneratorMetrics extends MetricsBase {
  constructor(
    @InjectMetric(AllocatorGaugeMetricsType.SUCCESS_ALLOCATOR_REPORTS_COUNT)
    private readonly successAllocatorsCount: Gauge<string>,

    @InjectMetric(AllocatorGaugeMetricsType.FAIL_ALLOCATOR_REPORTS_COUNT)
    private readonly failAllocatorsCount: Gauge<string>,
  ) {
    super();
  }

  public setSuccessAllocatorReportsMetric = (value: number) =>
    this.successAllocatorsCount
      .labels({
        env: this.env,
      })
      .set(value);

  public setFailAllocatorReportsMetric = (value: number) =>
    this.failAllocatorsCount
      .labels({
        env: this.env,
      })
      .set(value);
}
