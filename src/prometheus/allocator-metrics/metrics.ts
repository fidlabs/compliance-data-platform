import { makeGaugeProvider } from '@willsoto/nestjs-prometheus';

export enum AllocatorGaugeMetricsType {
  SUCCESS_ALLOCATOR_REPORTS_COUNT = 'success_allocator_reports_count',
  FAIL_ALLOCATOR_REPORTS_COUNT = 'fail_allocator_reports_count',
  AGGREGATION_SINGLE_TRANSACTION_TIME = 'aggregation_single_transaction_time',
  AGGREGATION_SINGLE_TRANSACTION_GET_DATA_TIME = 'aggregation_single_transaction_get_data_time',
  AGGREGATION_SINGLE_TRANSACTION_STORE_DATA_TIME = 'aggregation_single_transaction_store_data_time',
  AGGREGATION_SUMMARY_TIME = 'aggregation_summary_time',
}

const allocatorPrometheusGauges = [
  makeGaugeProvider({
    name: AllocatorGaugeMetricsType.SUCCESS_ALLOCATOR_REPORTS_COUNT,
    help: 'Number of successfully generated allocator reports',
  }),
  makeGaugeProvider({
    name: AllocatorGaugeMetricsType.FAIL_ALLOCATOR_REPORTS_COUNT,
    help: 'Number of fails during allocator reports generation',
  }),
  makeGaugeProvider({
    name: AllocatorGaugeMetricsType.AGGREGATION_SINGLE_TRANSACTION_TIME,
    help: 'The summary time of a single transaction',
    labelNames: ['runner_name'],
  }),
  makeGaugeProvider({
    name: AllocatorGaugeMetricsType.AGGREGATION_SUMMARY_TIME,
    help: 'The summary time of the entire aggregation',
  }),
  makeGaugeProvider({
    name: AllocatorGaugeMetricsType.AGGREGATION_SINGLE_TRANSACTION_GET_DATA_TIME,
    help: 'The time of getting data for a single transaction',
  }),
  makeGaugeProvider({
    name: AllocatorGaugeMetricsType.AGGREGATION_SINGLE_TRANSACTION_STORE_DATA_TIME,
    help: 'The time of storing data for a single transaction',
  }),
];

// to the next type of metrics e.g. Histogram, Counter, Summary, etc.
export const allocatorPrometheusMetrics = [...allocatorPrometheusGauges];
