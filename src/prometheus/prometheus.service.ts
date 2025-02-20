import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/db/prisma.service';
import { AggregateMetrics } from './aggregate-metrics';
import { AllocatorReportGeneratorMetrics } from './allocator-metrics';
import { ClientReportGeneratorMetrics } from './client-metrics';
import { PgPoolMetrics } from './db-metrics';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PrometheusMetricService {
  constructor(
    private readonly prisma: PrismaService,
    public readonly clientReportGeneratorMetrics: ClientReportGeneratorMetrics,
    public readonly allocatorReportGeneratorMetrics: AllocatorReportGeneratorMetrics,
    public readonly pgPoolMetrics: PgPoolMetrics,
    public readonly aggregateMetrics: AggregateMetrics,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async updateMetrics() {
    try {
      const result = await this.prisma.$queryRaw<
        { active: number; total: number }[]
      >`
        SELECT 
          COUNT(*) FILTER (WHERE state = 'active') AS active,
          COUNT(*) AS total
        FROM pg_stat_activity;
      `;

      const activeConnections = Number(result[0]?.active) || 0;
      const totalConnections = Number(result[0]?.total) || 0;

      this.pgPoolMetrics.setPgPoolActiveConnectionsCount(activeConnections);
      this.pgPoolMetrics.setPgPoolAllConnectionsCount(totalConnections);
    } catch (error) {
      console.error('Error fetching PGPool connections:', error);
    }
  }
}
