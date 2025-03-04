import { Injectable } from '@nestjs/common';
import { AggregateMetrics } from './aggregate-metrics';
import { AllocatorReportGeneratorMetrics } from './allocator-metrics';
import { ClientReportGeneratorMetrics } from './client-metrics';
import { PgPoolMetrics } from './db-metrics';

@Injectable()
export class PrometheusMetricService {
  constructor(
    public readonly clientReportGeneratorMetrics: ClientReportGeneratorMetrics,
    public readonly allocatorReportGeneratorMetrics: AllocatorReportGeneratorMetrics,
    public readonly pgPoolMetrics: PgPoolMetrics,
    public readonly aggregateMetrics: AggregateMetrics,
  ) {}

  updatePgPoolMetrics(
    totalCount: number,
    idleCount: number,
    waitingCount: number,
  ) {
    try {
      this.pgPoolMetrics.setPgPoolExistClientCount(totalCount);
      this.pgPoolMetrics.setPgPoolIdleClientCount(idleCount);
      this.pgPoolMetrics.setPgPoolWaitingClientCount(waitingCount);
    } catch (err) {
      console.error('Error fetching PGPool connections:', err);
    }
  }
}
