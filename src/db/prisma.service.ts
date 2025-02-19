import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from 'prisma/generated/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  public async onModuleInit() {
    await this.$connect();
  }

  async getMetrics() {
    const metrics = await this.$metrics.prometheus();
    return metrics;
  }
}
