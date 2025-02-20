import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Gauge } from 'prom-client';
import { AllocatorGaugeMetricsType } from './metrics';

export class AllocatorReportGeneratorMetrics {
  constructor(
    @InjectMetric(AllocatorGaugeMetricsType.AGGREGATION_SINGLE_TRANSACTION_TIME)
    private readonly transactionTimeByRunnerName: Gauge<string>,

    @InjectMetric(AllocatorGaugeMetricsType.AGGREGATION_SINGLE_TRANSACTION_TIME)
    private readonly transactionGetDataTimeByRunnerName: Gauge<string>,

    @InjectMetric(AllocatorGaugeMetricsType.AGGREGATION_SINGLE_TRANSACTION_TIME)
    private readonly transactionStoreDataTimeByRunnerName: Gauge<string>,

    @InjectMetric(AllocatorGaugeMetricsType.SUCCESS_ALLOCATOR_REPORTS_COUNT)
    private readonly successAllocatorsCount: Gauge<string>,

    @InjectMetric(AllocatorGaugeMetricsType.FAIL_ALLOCATOR_REPORTS_COUNT)
    private readonly failAllocatorsCount: Gauge<string>,

    @InjectMetric(AllocatorGaugeMetricsType.AGGREGATION_SUMMARY_TIME)
    private readonly aggregateTime: Gauge<string>,
  ) {}

  public setSuccessAllocatorReportsMetric = (value: number) =>
    this.successAllocatorsCount.set(value);

  public setFailAllocatorReportsMetric = (value: number) =>
    this.failAllocatorsCount.set(value);

  public startAggregateTimer = (): (() => void) => {
    return this.aggregateTime.startTimer();
  };

  public startTimerByRunnerNameMetric = (runnerName: string): (() => void) => {
    return this.transactionTimeByRunnerName
      .labels({ runner_name: runnerName })
      .startTimer();
  };

  public startGetDataTimerByRunnerNameMetric = (
    runnerName: string,
  ): (() => void) => {
    return this.transactionGetDataTimeByRunnerName
      .labels({ runner_name: runnerName })
      .startTimer();
  };

  public startStoreDataTimerByRunnerNameMetric = (
    runnerName: string,
  ): (() => void) => {
    return this.transactionStoreDataTimeByRunnerName
      .labels({ runner_name: runnerName })
      .startTimer();
  };
}
