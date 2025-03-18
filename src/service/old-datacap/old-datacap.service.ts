import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { getOldDatacapBalanceWeekly } from 'prisma/generated/client/sql';
import { DateTime } from 'luxon';
import {
  OldDatacapAllocatorBalanceWeek,
  OldDatacapAllocatorBalanceWeekResponse,
} from './types.allocator';
import { modelName } from 'src/utils/prisma';
import { Prisma } from 'prisma/generated/client';

@Injectable()
export class OldDatacapService {
  private readonly logger = new Logger(OldDatacapService.name);

  constructor(private readonly prismaService: PrismaService) {}

  public async getAllocatorBalance(): Promise<OldDatacapAllocatorBalanceWeekResponse> {
    const dbResults =
      await this.prismaService.old_datacap_balance_weekly.groupBy({
        by: ['week'],
        _count: {
          allocator: true,
        },
        _sum: {
          old_dc_balance: true,
        },
        orderBy: {
          week: 'asc',
        },
      });
    const results: OldDatacapAllocatorBalanceWeek[] = dbResults.map((r) => ({
      week: r.week,
      totalAllocators: r._count.allocator,
      totalOldDatacap: r._sum.old_dc_balance,
    }));
    return { results };
  }
}
