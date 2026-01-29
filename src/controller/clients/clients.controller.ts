import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  Controller,
  Get,
  Inject,
  Logger,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { DateTime } from 'luxon';
import { PrismaService } from 'src/db/prisma.service';
import { PrismaDmobService } from 'src/db/prismaDmob.service';
import { ClientService } from 'src/service/client/client.service';
import { bigIntDiv, type BigIntString } from 'src/utils/utils';
import { ControllerBase } from '../base/controller-base';
import {
  DashboardStatistic,
  DashboardStatisticValue,
} from '../base/types.controller-base';
import {
  ClientsDashboardStatistic,
  ClientsDashboardStatisticType,
  GetClientLatestClaimRequest,
  GetClientLatestClaimResponse,
  GetClientsStatisticsRequest,
  GetClientStorageProvidersResponse,
} from './types.clients';

const dashboardStatisticsTitleDict: Record<
  ClientsDashboardStatistic['type'],
  ClientsDashboardStatistic['title']
> = {
  TOTAL_CLIENTS: 'Total Clients',
  TOTAL_ACTIVE_CLIENTS: 'Active Clients',
  FAILING_CLIENTS: 'Failing Clients',
  DATACAP_SPENT_BY_CLIENTS: 'Datacap Spent by Clients',
  CLIENTS_WITH_ACTIVE_DEALS: 'Client With Active Deals',
  CLIENTS_WITH_ACTIVE_DEALS_AND_DATACAP:
    'Client With Active Deals and Remaining DC',
  TOTAL_REMAINING_CLIENTS_DATACAP: 'Total Remaining Datacap',
};

const dashboardStatisticsDescriptionDict: Record<
  ClientsDashboardStatistic['type'],
  ClientsDashboardStatistic['description']
> = {
  TOTAL_CLIENTS: null,
  TOTAL_ACTIVE_CLIENTS: 'Number of Clients that spent DataCap in last 60 days',
  FAILING_CLIENTS:
    'Percentage of Clients that are failing more than 50% of report checks',
  DATACAP_SPENT_BY_CLIENTS: null,
  CLIENTS_WITH_ACTIVE_DEALS: null,
  CLIENTS_WITH_ACTIVE_DEALS_AND_DATACAP: null,
  TOTAL_REMAINING_CLIENTS_DATACAP: null,
};

const negativeStatistics = [
  'FAILING_CLIENTS',
] satisfies ClientsDashboardStatisticType[];

@Controller('clients')
export class ClientsController extends ControllerBase {
  private readonly logger = new Logger(ClientsController.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly prismaService: PrismaService,
    private readonly clientService: ClientService,
    private readonly prismaDmobService: PrismaDmobService,
  ) {
    super();
  }

  @Get(':client/providers')
  @ApiOperation({
    summary: 'Get list of storage providers for a given client',
  })
  @ApiOkResponse({
    description: 'List of storage providers for a given client',
    type: GetClientStorageProvidersResponse,
  })
  public async getClientStorageProviders(
    @Param('client') clientIdOrAddress: string,
  ): Promise<GetClientStorageProvidersResponse> {
    const clientData =
      await this.clientService.getClientData(clientIdOrAddress);

    if (!clientData?.length) throw new NotFoundException();

    const clientProviderDistribution =
      await this.prismaService.client_provider_distribution.findMany({
        where: {
          client: clientData[0].addressId,
        },
        omit: {
          client: true,
        },
      });

    const totalDealSizeSum = clientProviderDistribution.reduce(
      (acc, provider) => acc + provider.total_deal_size,
      0n,
    );

    const dmobDbClientName =
      clientData.find((c) => c.name)?.name?.trim() ?? null;
    const dmobDbClientOrgName =
      clientData.find((c) => c.orgName)?.orgName?.trim() ?? null;

    // Prefer bookkeeping client name over dmob db names
    const clientName =
      (
        await this.clientService.getClientBookkeepingInfo(
          clientData[0].addressId,
        )
      )?.clientName ||
      dmobDbClientName ||
      dmobDbClientOrgName;

    return {
      name: clientName,
      stats: clientProviderDistribution.map((provider) => ({
        provider: provider.provider,
        total_deal_size: provider.total_deal_size,
        percent: bigIntDiv(
          provider.total_deal_size * 100n,
          totalDealSizeSum,
        ).toFixed(2),
      })),
    };
  }

  @Get(':clientId/latest-claims')
  @ApiOperation({
    summary: 'Get list of latest claims for a given client',
  })
  @ApiOkResponse({
    description: 'List of latest claims for a given client',
    type: GetClientLatestClaimResponse,
  })
  public async getClientLatestClaims(
    @Param('clientId') clientId: string,
    @Query() query: GetClientLatestClaimRequest,
  ): Promise<GetClientLatestClaimResponse> {
    const paginationInfo = this.validatePaginationInfo(query);
    const paginationQuery = this.validateQueryPagination(paginationInfo);

    const sort = query.sort ?? 'createdAt';
    const order = query.order ?? 'desc';
    const clientIdPrefix = clientId.startsWith('f0')
      ? clientId.slice(2)
      : clientId;

    let where = {};
    let whereHourly = {};

    if (query.filter) {
      const providerIdPrefix = query.filter.startsWith('f0')
        ? query.filter.slice(2)
        : query.filter;

      where = {
        OR: [
          { providerId: { contains: providerIdPrefix, mode: 'insensitive' } },
          { pieceCid: { contains: query.filter, mode: 'insensitive' } },
        ],
      };

      whereHourly = {
        provider: {
          contains: providerIdPrefix,
          mode: 'insensitive',
        },
      };
    }

    const [
      [unifiedVerifiedDeal, totalSumOfDdoPieceSize, totalSumOfNonDdoPieceSize],
      unifiedVerifiedDealHourly,
    ] = await Promise.all([
      this.prismaDmobService.$transaction([
        this.prismaDmobService.unified_verified_deal.findMany({
          select: {
            id: true,
            dealId: true,
            clientId: true,
            type: true,
            providerId: true,
            pieceCid: true,
            pieceSize: true,
            createdAt: true,
          },
          where: {
            clientId: clientIdPrefix,
            ...where,
          },
          orderBy: [{ [sort]: order }, { id: order }], // a secondary sort for the same e.g. createdAt
          ...paginationQuery,
        }),
        this.prismaDmobService.unified_verified_deal.aggregate({
          where: {
            dealId: 0, // DDO deals
            clientId: clientIdPrefix,
            ...where,
          },
          _sum: { pieceSize: true },
        }),
        this.prismaDmobService.unified_verified_deal.aggregate({
          where: {
            dealId: { not: 0 }, // non-DDO deals
            clientId: clientIdPrefix,
            ...where,
          },
          _sum: { pieceSize: true },
        }),
      ]),
      this.prismaService.unified_verified_deal_hourly.findMany({
        where: {
          client: clientId,
          ...whereHourly,
        },
      }),
    ]);

    const clientClaims = unifiedVerifiedDeal.map((claim) => ({
      ...claim,
      pieceSize: claim.pieceSize.toString(),
      isDDO: claim.dealId === 0,
    }));

    return this.withPaginationInfo(
      {
        totalSumOfDdoPieceSize:
          totalSumOfDdoPieceSize._sum.pieceSize?.toString() ?? '0',
        totalSumOfNonDdoPieceSize:
          totalSumOfNonDdoPieceSize._sum.pieceSize?.toString() ?? '0',
        count: clientClaims.length,
        data: clientClaims,
      },
      query,
      unifiedVerifiedDealHourly.reduce(
        (acc, curr) => acc + curr.num_of_claims,
        0,
      ) ?? 0,
    );
  }

  @Get('/statistics')
  @ApiOperation({
    summary: 'Get list of statistics regarding clients',
  })
  @ApiOkResponse({
    description: 'List of statistics regarding clients',
    type: [ClientsDashboardStatistic],
  })
  public async getClientsStatistics(
    @Query() query: GetClientsStatisticsRequest,
  ): Promise<ClientsDashboardStatistic[]> {
    const { interval = 'day' } = query;
    const cutoffDate = DateTime.now()
      .toUTC()
      .minus({ [interval]: 1 })
      .toJSDate();

    const [
      currentClientsCount,
      previousClientsCount,
      currentActiveClientsCount,
      previousActiveClientsCount,
      currentFailingClientsPercentage,
      previousFailingClientsPercentage,
      currentDatacapSpentByClients,
      previousDatacapSpentByClients,
      currentGenericStats,
      previousGenericStats,
    ] = await Promise.all([
      this.clientService.getClientsCountStat(),
      this.clientService.getClientsCountStat({ cutoffDate: cutoffDate }),
      this.clientService.getActiveClientsStat(),
      this.clientService.getActiveClientsStat({ cutoffDate: cutoffDate }),
      this.clientService.getFailingClientsPercentageStat(),
      this.clientService.getFailingClientsPercentageStat({
        cutoffDate: cutoffDate,
      }),
      this.clientService.getDatacapSpentByClientsStat(),
      this.clientService.getDatacapSpentByClientsStat({
        cutoffDate: cutoffDate,
      }),
      this.clientService.getClientsGenericStats(),
      this.clientService.getClientsGenericStats({ cutoffDate }),
    ]);

    return [
      this.calculateDashboardStatistic({
        type: 'TOTAL_CLIENTS',
        currentValue: {
          value: currentClientsCount,
          type: 'numeric',
        },
        previousValue: {
          value: previousClientsCount,
          type: 'numeric',
        },
        interval: interval,
      }),
      this.calculateDashboardStatistic({
        type: 'TOTAL_ACTIVE_CLIENTS',
        currentValue: {
          value: currentActiveClientsCount,
          type: 'numeric',
        },
        previousValue: {
          value: previousActiveClientsCount,
          type: 'numeric',
        },
        interval: interval,
      }),
      this.calculateDashboardStatistic({
        type: 'FAILING_CLIENTS',
        currentValue: {
          value: currentFailingClientsPercentage,
          type: 'percentage',
        },
        previousValue: {
          value: previousFailingClientsPercentage,
          type: 'percentage',
        },
        interval: interval,
      }),
      this.calculateDashboardStatistic({
        type: 'DATACAP_SPENT_BY_CLIENTS',
        currentValue: {
          value: currentDatacapSpentByClients,
          type: 'bigint',
        },
        previousValue: {
          value: previousDatacapSpentByClients,
          type: 'bigint',
        },
        interval: interval,
      }),
      this.calculateDashboardStatistic({
        type: 'CLIENTS_WITH_ACTIVE_DEALS',
        currentValue: {
          value: currentGenericStats
            ? currentGenericStats.clients_with_active_deals
            : 0,
          type: 'numeric',
        },
        previousValue: {
          value: previousGenericStats
            ? previousGenericStats.clients_with_active_deals
            : 0,
          type: 'numeric',
        },
        interval: interval,
      }),
      this.calculateDashboardStatistic({
        type: 'CLIENTS_WITH_ACTIVE_DEALS_AND_DATACAP',
        currentValue: {
          value: currentGenericStats
            ? currentGenericStats.clients_who_have_dc_and_deals
            : 0,
          type: 'numeric',
        },
        previousValue: {
          value: previousGenericStats
            ? previousGenericStats.clients_who_have_dc_and_deals
            : 0,
          type: 'numeric',
        },
        interval: interval,
      }),
      this.calculateDashboardStatistic({
        type: 'TOTAL_REMAINING_CLIENTS_DATACAP',
        currentValue: {
          value: currentGenericStats
            ? (currentGenericStats.total_remaining_clients_datacap.toString() as BigIntString)
            : '0',
          type: 'bigint',
        },
        previousValue: {
          value: previousGenericStats
            ? (previousGenericStats.total_remaining_clients_datacap.toString() as BigIntString)
            : '0',
          type: 'bigint',
        },
        interval: interval,
      }),
    ];
  }

  private calculateDashboardStatistic(options: {
    type: ClientsDashboardStatistic['type'];
    currentValue: DashboardStatisticValue;
    previousValue: DashboardStatisticValue;
    interval: DashboardStatistic['percentageChange']['interval'];
  }): ClientsDashboardStatistic {
    const { type, currentValue, previousValue, interval } = options;

    if (currentValue.type !== previousValue.type) {
      throw new TypeError(
        'Cannot compare different dashboard statistics types',
      );
    }

    const percentageChange: ClientsDashboardStatistic['percentageChange'] =
      (() => {
        if (BigInt(previousValue.value) === 0n) return null;

        const ratio =
          currentValue.type === 'bigint' || previousValue.type === 'bigint'
            ? bigIntDiv(
                BigInt(currentValue.value),
                BigInt(previousValue.value),
                2,
              )
            : currentValue.value / previousValue.value;

        return {
          value: ratio - 1,
          interval: interval,
          increaseNegative: (negativeStatistics as string[]).includes(type),
        };
      })();

    return {
      type: type,
      title: dashboardStatisticsTitleDict[type],
      description: dashboardStatisticsDescriptionDict[type],
      value: currentValue,
      percentageChange: percentageChange,
    };
  }
}
