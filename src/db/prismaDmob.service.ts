import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from 'prismaDmob/generated/client';

@Injectable()
export class PrismaDmobService extends PrismaClient implements OnModuleInit {
  public async onModuleInit() {
    await this.$connect();
  }
}
