import { makeGaugeProvider } from '@willsoto/nestjs-prometheus';

export enum GaugeMetrics {
  SUCCESS_CLIENT_REPORTS = 'success_client_reports',
  FAIL_CLIENT_REPORTS = 'fail_client_reports',
  AGGREGATION_SINGLE_TRANSACTION_TIME = 'aggregation_single_transaction_time',
  AGGREGATION_SUMMARY_TIME = 'aggregation_summary_time',
}

export const prometheusGauges = [
  makeGaugeProvider({
    name: GaugeMetrics.SUCCESS_CLIENT_REPORTS,
    help: 'Number of successfully client REPORTS',
  }),
  makeGaugeProvider({
    name: GaugeMetrics.FAIL_CLIENT_REPORTS,
    help: 'Number of fail client REPORTS',
  }),
  makeGaugeProvider({
    name: GaugeMetrics.AGGREGATION_SINGLE_TRANSACTION_TIME,
    help: 'The summary time of single transaction',
    labelNames: ['runner_name'],
  }),
  makeGaugeProvider({
    name: GaugeMetrics.AGGREGATION_SUMMARY_TIME,
    help: 'The summary time of entire aggregation',
  }),
];
