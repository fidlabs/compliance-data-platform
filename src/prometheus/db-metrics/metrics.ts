import { makeGaugeProvider } from '@willsoto/nestjs-prometheus';

export enum PgPoolCdpGaugeMetricsType {
  PG_POOL_CLIENT_EXIST_COUNT = 'pgpool_client_count',
  PG_POOL_CLIENT_IDLE_COUNT = 'pgpool_client_idle_count',
  PG_POOL_CLIENT_WAITING_COUNT = 'pgpool_client_waiting_count',
}

const pgPoolPrometheusGauges = [
  makeGaugeProvider({
    name: PgPoolCdpGaugeMetricsType.PG_POOL_CLIENT_EXIST_COUNT,
    help: 'The total number of clients existing within the pool.',
    labelNames: ['env'],
  }),
  makeGaugeProvider({
    name: PgPoolCdpGaugeMetricsType.PG_POOL_CLIENT_IDLE_COUNT,
    help: 'The number of clients which are not checked out but are currently idle in the pool.',
    labelNames: ['env'],
  }),
  makeGaugeProvider({
    name: PgPoolCdpGaugeMetricsType.PG_POOL_CLIENT_WAITING_COUNT,
    help: 'The number of clients which are currently waiting to be checked out from the pool.',
    labelNames: ['env'],
  }),
];

export const pgPoolPrometheusMetrics = [...pgPoolPrometheusGauges];
