import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import {
  OldDatacapAllocatorBalanceWeek,
  OldDatacapAllocatorBalanceWeekResponse,
  OldDatacapClientBalanceWeek,
  OldDatacapClientBalanceWeekResponse,
} from './types.old-datacap';

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
          allocations: true,
        },
        skip: 1, // first week is a week before nv22, we don't care about it
        orderBy: {
          week: 'asc',
        },
      });

    const results: OldDatacapAllocatorBalanceWeek[] = dbResults.map((r) => ({
      week: r.week,
      allocators: r._count.allocator,
      oldDatacap: r._sum.old_dc_balance,
      allocations: r._sum.allocations,
    }));

    return { results };
  }

  public async getClientBalance(): Promise<OldDatacapClientBalanceWeekResponse> {
    const dbResults =
      await this.prismaService.old_datacap_client_balance_weekly.groupBy({
        by: ['week'],
        _count: {
          client: true,
        },
        _sum: {
          old_dc_balance: true,
          claims: true,
        },
        skip: 1, // first week is a week before nv22, we don't care about it
        orderBy: {
          week: 'asc',
        },
      });
    const results: OldDatacapClientBalanceWeek[] = dbResults.map((r) => ({
      week: r.week,
      clients: r._count.client,
      oldDatacap: r._sum.old_dc_balance,
      claims: r._sum.claims,
    }));
    return { results };
  }
}
