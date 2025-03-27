import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Gauge } from 'prom-client';
import { MetricsBase } from '../metrics-base';
import { AggregateGaugeMetricsType } from './metrics';

export class AggregateMetrics extends MetricsBase {
  constructor(
    @InjectMetric(AggregateGaugeMetricsType.AGGREGATION_SINGLE_TRANSACTION_TIME)
    private readonly transactionTimeByRunnerName: Gauge<string>,

    @InjectMetric(
      AggregateGaugeMetricsType.AGGREGATION_SINGLE_TRANSACTION_GET_DATA_TIME,
    )
    private readonly transactionGetDataTimeByRunnerName: Gauge<string>,

    @InjectMetric(
      AggregateGaugeMetricsType.AGGREGATION_SINGLE_TRANSACTION_STORE_DATA_TIME,
    )
    private readonly transactionStoreDataTimeByRunnerName: Gauge<string>,

    @InjectMetric(AggregateGaugeMetricsType.AGGREGATION_SUMMARY_TIME)
    private readonly aggregateTime: Gauge<string>,
  ) {
    super();
  }

  public startAggregateTimer = (): (() => void) => {
    return this.aggregateTime.labels({ env: this.env }).startTimer();
  };

  public startTimerByRunnerNameMetric = (runnerName: string): (() => void) => {
    return this.transactionTimeByRunnerName
      .labels({
        runner_name: runnerName,
        env: this.env,
      })
      .startTimer();
  };

  public startGetDataTimerByRunnerNameMetric = (
    runnerName: string,
  ): (() => void) => {
    return this.transactionGetDataTimeByRunnerName
      .labels({ runner_name: runnerName, env: this.env })
      .startTimer();
  };

  public startStoreDataTimerByRunnerNameMetric = (
    runnerName: string,
  ): (() => void) => {
    return this.transactionStoreDataTimeByRunnerName
      .labels({ runner_name: runnerName, env: this.env })
      .startTimer();
  };
}
