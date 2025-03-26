import { makeGaugeProvider } from '@willsoto/nestjs-prometheus';

export enum ClientGaugeMetricsType {
  SUCCESS_CLIENT_REPORTS_COUNT = 'success_client_reports_count',
  FAIL_CLIENT_REPORTS_COUNT = 'fail_client_reports_count',
}

const clientPrometheusGauges = [
  makeGaugeProvider({
    name: ClientGaugeMetricsType.SUCCESS_CLIENT_REPORTS_COUNT,
    help: 'Number of successfully generated client reports',
    labelNames: ['env'],
  }),
  makeGaugeProvider({
    name: ClientGaugeMetricsType.FAIL_CLIENT_REPORTS_COUNT,
    help: 'Number of fails during client reports generation',
    labelNames: ['env'],
  }),
];

// to the next type of metrics e.g. Histogram, Counter, Summary, etc.
export const clientPrometheusMetrics = [...clientPrometheusGauges];
