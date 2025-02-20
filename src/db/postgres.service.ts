import { Injectable, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PostgresService implements OnModuleInit {
  public pool: Pool;

  constructor(private configService: ConfigService) {}

  public async onModuleInit() {
    this.pool = new Pool({
      connectionString: this.configService.get<string>('DATABASE_URL'),
    });
  }

  public async getMetrics(): Promise<{
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  }> {
    const { totalCount, idleCount, waitingCount } = this.pool;

    return {
      totalCount,
      idleCount,
      waitingCount,
    };
  }
}
