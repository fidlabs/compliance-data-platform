import { Interval } from '@nestjs/schedule';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Gauge } from 'prom-client';
import { PrismaService } from 'src/db/prisma.service';
import { PgPoolCdpGaugeMetricsType } from './metrics';

export class PgPoolMetrics {
  constructor(
    private readonly prisma: PrismaService,

    @InjectMetric(PgPoolCdpGaugeMetricsType.PG_POOL_ACTIVE_CONNECTIONS_COUNT)
    private readonly pgPoolActiveConnectionsCount: Gauge<string>,

    @InjectMetric(PgPoolCdpGaugeMetricsType.PG_POOL_ALL_CONNECTIONS_COUNT)
    private readonly pgPoolAllConnectionsCount: Gauge<string>,
  ) {}

  setPgPoolActiveConnectionsCount = (value: number) =>
    this.pgPoolActiveConnectionsCount.set(value);

  setPgPoolAllConnectionsCount = (value: number) =>
    this.pgPoolAllConnectionsCount.set(value);

  @Interval(10000) // 10 seconds
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

      this.setPgPoolActiveConnectionsCount(activeConnections);
      this.setPgPoolAllConnectionsCount(totalConnections);
    } catch (error) {
      console.error('Error fetching PGPool connections:', error);
    }
  }
}
