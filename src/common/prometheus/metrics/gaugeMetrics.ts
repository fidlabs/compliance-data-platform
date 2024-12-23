import { makeGaugeProvider } from '@willsoto/nestjs-prometheus';

export enum GaugeMetrics {
  SUCCESS_CLIENT_REPORTS = 'success_client_reports',
  FAIL_CLIENT_REPORTS = 'fail_client_reports',
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
];
