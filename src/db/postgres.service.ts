import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { PrometheusMetricService } from 'src/prometheus';

@Injectable()
export class PostgresService implements OnModuleInit {
  public pool: Pool;

  constructor(
    public readonly prometheusService: PrometheusMetricService,
    configService: ConfigService,
  ) {
    this.pool = new Pool({
      connectionString: configService.get<string>('DATABASE_URL'),
      ssl: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    });
  }

  updatePoolStats() {
    const { totalCount, idleCount, waitingCount } = this.pool;

    this.prometheusService.updatePgPoolMetrics(
      totalCount,
      idleCount,
      waitingCount,
    );
  }

  public async onModuleInit() {
    this.pool.on('connect', () => {
      this.updatePoolStats();
    });
    this.pool.on('acquire', () => {
      this.updatePoolStats();
    });
    this.pool.on('remove', () => {
      this.updatePoolStats();
    });
  }
}
