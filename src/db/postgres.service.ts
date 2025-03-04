import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { PrometheusMetricService } from 'src/prometheus';

@Injectable()
export class PostgresService implements OnModuleInit {
  public pool: Pool;

  constructor(
    private configService: ConfigService,
    public readonly prometheusService: PrometheusMetricService,
  ) {}

  updatePoolStats() {
    const { totalCount, idleCount, waitingCount } = this.pool;

    this.prometheusService.updatePgPoolMetrics(
      totalCount,
      idleCount,
      waitingCount,
    );
  }

  public async onModuleInit() {
    this.pool = new Pool({
      connectionString: this.configService.get<string>('DATABASE_URL'),
    });

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
