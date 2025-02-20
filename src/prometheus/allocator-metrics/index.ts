import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Gauge } from 'prom-client';
import { AllocatorGaugeMetricsType } from './metrics';

export class AllocatorReportGeneratorMetrics {
  constructor(
    @InjectMetric(AllocatorGaugeMetricsType.SUCCESS_ALLOCATOR_REPORTS_COUNT)
    private readonly successAllocatorsCount: Gauge<string>,

    @InjectMetric(AllocatorGaugeMetricsType.FAIL_ALLOCATOR_REPORTS_COUNT)
    private readonly failAllocatorsCount: Gauge<string>,
  ) {}

  public setSuccessAllocatorReportsMetric = (value: number) =>
    this.successAllocatorsCount.set(value);

  public setFailAllocatorReportsMetric = (value: number) =>
    this.failAllocatorsCount.set(value);
}
