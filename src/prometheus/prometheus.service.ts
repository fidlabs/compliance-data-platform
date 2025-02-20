import { AllocatorMetrics } from './allocator-metrics';
import { ClientMetrics } from './client-metrics';
import { PgPoolMetrics } from './db-metrics';

export class PrometheusMetricService {
  constructor(
    public readonly clientMetrics: ClientMetrics,
    public readonly allocatorMetrics: AllocatorMetrics,
    public readonly pgPoolMetrics: PgPoolMetrics,
  ) {}
}
