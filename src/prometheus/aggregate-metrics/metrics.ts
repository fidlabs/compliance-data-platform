import { makeGaugeProvider } from '@willsoto/nestjs-prometheus';

export enum AggregateGaugeMetricsType {
  AGGREGATION_SINGLE_TRANSACTION_TIME = 'aggregation_single_transaction_time',
  AGGREGATION_SINGLE_TRANSACTION_GET_DATA_TIME = 'aggregation_single_transaction_get_data_time',
  AGGREGATION_SINGLE_TRANSACTION_STORE_DATA_TIME = 'aggregation_single_transaction_store_data_time',
  AGGREGATION_SUMMARY_TIME = 'aggregation_summary_time',
}

const runnerLabelNames = ['runner_name', 'env'];

const aggregatePrometheusGauges = [
  makeGaugeProvider({
    name: AggregateGaugeMetricsType.AGGREGATION_SINGLE_TRANSACTION_TIME,
    help: 'The summary time of a single transaction',
    labelNames: runnerLabelNames,
  }),
  makeGaugeProvider({
    name: AggregateGaugeMetricsType.AGGREGATION_SUMMARY_TIME,
    help: 'The summary time of the entire aggregation',
    labelNames: ['env'],
  }),
  makeGaugeProvider({
    name: AggregateGaugeMetricsType.AGGREGATION_SINGLE_TRANSACTION_GET_DATA_TIME,
    help: 'The time of getting data for a single transaction',
    labelNames: runnerLabelNames,
  }),
  makeGaugeProvider({
    name: AggregateGaugeMetricsType.AGGREGATION_SINGLE_TRANSACTION_STORE_DATA_TIME,
    help: 'The time of storing data for a single transaction',
    labelNames: runnerLabelNames,
  }),
];

// to the next type of metrics e.g. Histogram, Counter, Summary, etc.
export const aggregatePrometheusMetrics = [...aggregatePrometheusGauges];
