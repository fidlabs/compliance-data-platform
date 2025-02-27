import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PostgresService } from 'src/db/postgres.service';
import { AggregateMetrics } from './aggregate-metrics';
import { AllocatorReportGeneratorMetrics } from './allocator-metrics';
import { ClientReportGeneratorMetrics } from './client-metrics';
import { PgPoolMetrics } from './db-metrics';

@Injectable()
export class PrometheusMetricService {
  constructor(
    private readonly postgresService: PostgresService,
    public readonly clientReportGeneratorMetrics: ClientReportGeneratorMetrics,
    public readonly allocatorReportGeneratorMetrics: AllocatorReportGeneratorMetrics,
    public readonly pgPoolMetrics: PgPoolMetrics,
    public readonly aggregateMetrics: AggregateMetrics,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async updateMetrics() {
    try {
      const { idleCount, totalCount, waitingCount } =
        await this.postgresService.getMetrics();

      this.pgPoolMetrics.setPgPoolExistClientCount(totalCount);
      this.pgPoolMetrics.setPgPoolIdleClientCount(idleCount);
      this.pgPoolMetrics.setPgPoolWaitingClientCount(waitingCount);
    } catch (err) {
      console.error('Error fetching PGPool connections:', err);
    }
  }
}
