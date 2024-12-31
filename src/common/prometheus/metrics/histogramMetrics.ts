import { makeHistogramProvider } from '@willsoto/nestjs-prometheus';

export enum HistogramMetrics {
  AGGREGATION_SINGLE_TRANSACTION_TIME = 'aggregation_single_transaction_time',
  AGGREGATION_SUMMARY_TIME = 'aggregation_summary_time',
}

export const prometheusHistograms = [
  makeHistogramProvider({
    name: HistogramMetrics.AGGREGATION_SINGLE_TRANSACTION_TIME,
    help: 'The summary time of single transaction',
    labelNames: ['runner_name'],
  }),
  makeHistogramProvider({
    name: HistogramMetrics.AGGREGATION_SUMMARY_TIME,
    help: 'The summary time of entire transaction',
  }),
];
