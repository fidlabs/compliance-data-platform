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
import { PrismaService } from 'src/db/prisma.service';
import { PrismaDmobService } from 'src/db/prismaDmob.service';
import { ClientService } from 'src/service/client/client.service';
import { bigIntDiv } from 'src/utils/utils';
import { ControllerBase } from '../base/controller-base';
import {
  GetClientLatestClaimRequest,
  GetClientLatestClaimResponse,
  GetClientStorageProvidersResponse,
} from './types.clients';

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
    const clientData = (
      await this.clientService.getClientData(clientIdOrAddress)
    )?.[0];

    if (!clientData?.addressId) throw new NotFoundException();

    const clientProviderDistribution =
      await this.prismaService.client_provider_distribution.findMany({
        where: {
          client: clientData.addressId,
        },
        omit: {
          client: true,
        },
      });

    const totalDealSizeSum = clientProviderDistribution.reduce(
      (acc, provider) => acc + provider.total_deal_size,
      0n,
    );

    return {
      name: clientData.name,
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
    query.page = query.page ?? '1';
    query.limit = query.limit ?? '15';

    const paginationInfo = this.validatePaginationInfo(query);

    const skip = (paginationInfo.page - 1) * paginationInfo.limit;
    const take = paginationInfo.limit;

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
          skip,
          take,
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
}
