import { makeGaugeProvider } from '@willsoto/nestjs-prometheus';

export enum AllocatorGaugeMetricsType {
  SUCCESS_ALLOCATOR_REPORTS_COUNT = 'success_allocator_reports_count',
  FAIL_ALLOCATOR_REPORTS_COUNT = 'fail_allocator_reports_count',
}

const allocatorPrometheusGauges = [
  makeGaugeProvider({
    name: AllocatorGaugeMetricsType.SUCCESS_ALLOCATOR_REPORTS_COUNT,
    help: 'Number of successfully generated allocator reports',
    labelNames: ['env'],
  }),
  makeGaugeProvider({
    name: AllocatorGaugeMetricsType.FAIL_ALLOCATOR_REPORTS_COUNT,
    help: 'Number of fails during allocator reports generation',
    labelNames: ['env'],
  }),
];

// to the next type of metrics e.g. Histogram, Counter, Summary, etc.
export const allocatorPrometheusMetrics = [...allocatorPrometheusGauges];
