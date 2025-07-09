import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from 'prisma/generated/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  public async onModuleInit() {
    await this.$connect();
  }

  async getMetrics() {
    return await this.$metrics.prometheus({
      globalLabels: {
        env: this.configService.get<string>('PROMETHEUS_METRICS_ENV'),
      },
    });
  }
}
