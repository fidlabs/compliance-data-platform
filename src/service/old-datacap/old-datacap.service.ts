import { Injectable, Logger } from '@nestjs/common';
import { groupBy } from 'lodash';
import { PrismaService } from 'src/db/prisma.service';
import {
  DEFAULT_FILPLUS_EDITION_ID,
  getFilPlusEditionWithDateTimeRange,
} from 'src/utils/filplus-edition';
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

  public async getAllocatorBalance(
    roundId = DEFAULT_FILPLUS_EDITION_ID,
  ): Promise<OldDatacapAllocatorBalanceWeekResponse> {
    const editionData = getFilPlusEditionWithDateTimeRange(roundId);

    const [aggResults, allRows] = await Promise.all([
      this.prismaService.old_datacap_balance_weekly.groupBy({
        by: ['week'],
        where: {
          week: {
            gte: editionData.startDate,
            lte: editionData.endDate,
          },
        },
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
          week: {
            gte: editionData.startDate,
            lte: editionData.endDate,
          },
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
    ]);

    const allocatorData = allRows.map((r) => ({
      week: r.week.toISOString(),
      allocator: r.allocator,
      oldDatacap: r.old_dc_balance,
      allocations: r.allocations,
    }));

    const byWeek = groupBy(allocatorData, (row) => row.week);

    const results: OldDatacapAllocatorBalanceWeek[] = aggResults.map((r) => ({
      week: r.week,
      allocators: r._count.allocator,
      oldDatacap: r._sum.old_dc_balance,
      allocations: r._sum.allocations,
      drilldown:
        byWeek[r.week.toISOString()].map((v) => ({
          allocator: v.allocator,
          oldDatacap: v.oldDatacap,
          allocations: v.allocations,
        })) ?? [],
    }));

    return { results };
  }

  public async getClientBalance(
    roundId = DEFAULT_FILPLUS_EDITION_ID,
  ): Promise<OldDatacapClientBalanceWeekResponse> {
    const editionData = getFilPlusEditionWithDateTimeRange(roundId);

    const [dbResults, allRows] = await Promise.all([
      this.prismaService.old_datacap_client_balance_weekly.groupBy({
        by: ['week'],
        where: {
          week: {
            gte: editionData.startDate,
            lte: editionData.endDate,
          },
        },
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
          week: {
            gte: editionData.startDate,
            lte: editionData.endDate,
          },
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
    ]);

    const clientData = allRows.map((r) => ({
      week: r.week.toISOString(),
      client: r.client,
      oldDatacap: r.old_dc_balance,
      claims: r.claims,
    }));

    const byWeek = groupBy(clientData, (row) => row.week);

    const results: OldDatacapClientBalanceWeek[] = dbResults.map((r) => ({
      week: r.week,
      clients: r._count.client,
      oldDatacap: r._sum.old_dc_balance,
      claims: r._sum.claims,
      drilldown:
        byWeek[r.week.toISOString()].map((v) => ({
          client: v.client,
          oldDatacap: v.oldDatacap,
          claims: v.claims,
        })) ?? [],
    }));
    return { results };
  }
}
