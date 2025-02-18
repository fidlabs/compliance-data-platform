import { AllocatorMetrics } from './allocator-metrics';
import { ClientMetrics } from './client-metrics';

export class PrometheusMetricService {
  constructor(
    public readonly clientMetrics: ClientMetrics,
    public readonly allocatorMetrics: AllocatorMetrics,
  ) {}
}
