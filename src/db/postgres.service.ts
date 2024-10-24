import { Injectable, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PostgresService implements OnModuleInit {
  public pool: Pool;
  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.pool = new Pool({
      connectionString: this.configService.get<string>('DATABASE_URL'),
    });
  }
}
