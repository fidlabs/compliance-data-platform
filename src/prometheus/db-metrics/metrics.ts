import { makeGaugeProvider } from '@willsoto/nestjs-prometheus';

export enum PgPoolCdpGaugeMetricsType {
  PG_POOL_ACTIVE_CONNECTIONS_COUNT = 'pgpool_active_connections_count',
  PG_POOL_ALL_CONNECTIONS_COUNT = 'pgpool_all_connections_count',
}

const pgPoolPrometheusGauges = [
  makeGaugeProvider({
    name: PgPoolCdpGaugeMetricsType.PG_POOL_ACTIVE_CONNECTIONS_COUNT,
    help: 'Number of active connections in the PostgreSQL pool',
  }),
  makeGaugeProvider({
    name: PgPoolCdpGaugeMetricsType.PG_POOL_ALL_CONNECTIONS_COUNT,
    help: 'Number of all connections in the PostgreSQL pool',
  }),
];

export const pgPoolPrometheusMetrics = [...pgPoolPrometheusGauges];
