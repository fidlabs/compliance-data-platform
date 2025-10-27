import { Injectable, Logger } from '@nestjs/common';
import { groupBy } from 'lodash';
import { PrismaService } from 'src/db/prisma.service';
import {
  OldDatacapAllocatorBalanceWeek,
  OldDatacapClientBalanceWeek,
} from './types.old-datacap';
import { PrismaDmobService } from 'src/db/prismaDmob.service';

@Injectable()
export class OldDatacapService {
  private readonly logger = new Logger(OldDatacapService.name);
  constructor(
    private readonly prismaService: PrismaService,
    private readonly prismaDmobService: PrismaDmobService,
  ) {}

  public async getAllocatorBalance(): Promise<
    OldDatacapAllocatorBalanceWeek[]
  > {
    const [aggResults, allRows, allocators] = await Promise.all([
      this.prismaService.old_datacap_balance_weekly.groupBy({
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
      }),
      this.prismaService.old_datacap_balance_weekly.findMany({
        where: {
          OR: [
            {
              old_dc_balance: {
                gt: 0,
              },
            },
            {
              allocations: {
                gt: 0,
              },
            },
          ],
        },
      }),
      this.prismaService.allocator.findMany(),
    ]);

    const allocatorData = allRows.map((r) => ({
      week: r.week.toISOString(),
      allocator: r.allocator,
      oldDatacap: r.old_dc_balance,
      allocations: r.allocations,
    }));

    const byWeek = groupBy(allocatorData, (row) => row.week);
    const allocatorsGrouped = groupBy(allocators, (a) => a.id);

    return aggResults.map((r) => ({
      week: r.week,
      allocators: r._count.allocator,
      oldDatacap: r._sum.old_dc_balance,
      allocations: r._sum.allocations,
      drilldown:
        byWeek[r.week.toISOString()].map((v) => ({
          allocator: v.allocator,
          allocatorName:
            allocatorsGrouped[v.allocator]?.[0]?.name?.trim() || null,
          oldDatacap: v.oldDatacap,
          allocations: v.allocations,
        })) ?? [],
    }));
  }

  public async getClientBalance(): Promise<OldDatacapClientBalanceWeek[]> {
    const [dbResults, allRows, clients] = await Promise.all([
      this.prismaService.old_datacap_client_balance_weekly.groupBy({
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
      }),
      this.prismaService.old_datacap_client_balance_weekly.findMany({
        where: {
          OR: [
            {
              old_dc_balance: {
                gt: 0,
              },
            },
            {
              claims: {
                gt: 0,
              },
            },
          ],
        },
      }),
      this.prismaDmobService.verified_client.findMany(),
    ]);

    const clientData = allRows.map((r) => ({
      week: r.week.toISOString(),
      client: r.client,
      oldDatacap: r.old_dc_balance,
      claims: r.claims,
    }));

    const byWeek = groupBy(clientData, (row) => row.week);
    const clientsGrouped = groupBy(clients, (c) => c.addressId);

    return dbResults.map((r) => ({
      week: r.week,
      clients: r._count.client,
      oldDatacap: r._sum.old_dc_balance,
      claims: r._sum.claims,
      drilldown:
        byWeek[r.week.toISOString()].map((v) => ({
          client: v.client,
          clientName: clientsGrouped[v.client]?.[0]?.name?.trim() || null,
          oldDatacap: v.oldDatacap,
          claims: v.claims,
        })) ?? [],
    }));
  }
}
