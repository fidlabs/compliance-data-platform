import { Injectable, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PostgresDmobService implements OnModuleInit {
  public pool: Pool;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.pool = new Pool({
      connectionString: this.configService.get<string>('DMOB_DATABASE_URL'),
    });
  }
}
