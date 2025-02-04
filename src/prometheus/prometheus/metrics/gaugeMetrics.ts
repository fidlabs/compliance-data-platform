import { makeGaugeProvider } from '@willsoto/nestjs-prometheus';

export enum GaugeMetrics {
  SUCCESS_CLIENT_REPORTS = 'success_client_reports',
  FAIL_CLIENT_REPORTS = 'fail_client_reports',
  SUCCESS_ALLOCATOR_REPORTS = 'success_allocator_reports',
  FAIL_ALLOCATOR_REPORTS = 'fail_allocator_reports',
  AGGREGATION_SINGLE_TRANSACTION_TIME = 'aggregation_single_transaction_time',
  AGGREGATION_SUMMARY_TIME = 'aggregation_summary_time',
}

export const prometheusGauges = [
  makeGaugeProvider({
    name: GaugeMetrics.SUCCESS_CLIENT_REPORTS,
    help: 'Number of successfully generated client reports',
  }),
  makeGaugeProvider({
    name: GaugeMetrics.FAIL_CLIENT_REPORTS,
    help: 'Number of fails during client reports generation',
  }),
  makeGaugeProvider({
    name: GaugeMetrics.SUCCESS_ALLOCATOR_REPORTS,
    help: 'Number of successfully generated allocator reports',
  }),
  makeGaugeProvider({
    name: GaugeMetrics.FAIL_ALLOCATOR_REPORTS,
    help: 'Number of fails during allocator reports generation',
  }),
  makeGaugeProvider({
    name: GaugeMetrics.AGGREGATION_SINGLE_TRANSACTION_TIME,
    help: 'The summary time of a single transaction',
    labelNames: ['runner_name'],
  }),
  makeGaugeProvider({
    name: GaugeMetrics.AGGREGATION_SUMMARY_TIME,
    help: 'The summary time of the entire aggregation',
  }),
];
