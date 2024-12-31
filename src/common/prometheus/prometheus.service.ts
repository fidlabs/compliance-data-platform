import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Gauge, Histogram } from 'prom-client';
import { GaugeMetrics } from './metrics/gaugeMetrics';
import { HistogramMetrics } from './metrics/histogramMetrics';

export class PrometheusMetricService {
  constructor(
    @InjectMetric(GaugeMetrics.SUCCESS_CLIENT_REPORTS)
    private readonly successClientReports: Gauge<string>,
    @InjectMetric(GaugeMetrics.FAIL_CLIENT_REPORTS)
    private readonly failClientReports: Gauge<string>,
    @InjectMetric(HistogramMetrics.AGGREGATION_SINGLE_TRANSACTION_TIME)
    private readonly aggregationSingleTransactionTimeHistogram: Histogram<string>,
    @InjectMetric(HistogramMetrics.AGGREGATION_SUMMARY_TIME)
    private readonly aggregationEntireTimeHistogram: Histogram<string>,
  ) {}

  public setSuccessClientReportsMetric = (value: number) =>
    this.successClientReports.set(value);

  public setFailClientReportsMetric = (value: number) =>
    this.failClientReports.set(value);

  public startAggregationTransactionTimer = (
    runnerName: string,
  ): (() => void) => {
    return this.aggregationSingleTransactionTimeHistogram
      .labels({ runner_name: runnerName })
      .startTimer();
  };

  public startEntireAggregationTimer = (): (() => void) => {
    return this.aggregationEntireTimeHistogram.startTimer();
  };
}
