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
import { ClientService } from 'src/service/client/client.service';
import {
  GetClientLatestClaimRequest,
  GetClientStorageProvidersResponse,
} from './types.clients';
import { ClientLatestClaim } from 'src/service/client/types.client';

@Controller('clients')
export class ClientsController {
  private readonly logger = new Logger(ClientsController.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly prismaService: PrismaService,
    private readonly clientService: ClientService,
  ) {}

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

    const totalDealSizeSum = Number(
      clientProviderDistribution.reduce(
        (acc, provider) => acc + provider.total_deal_size,
        0n,
      ),
    );

    return {
      name: clientData.name,
      stats: clientProviderDistribution.map((provider) => ({
        provider: provider.provider,
        total_deal_size: provider.total_deal_size,
        percent: (
          (Number(provider.total_deal_size) / totalDealSizeSum) *
          100
        ).toFixed(2),
      })),
    };
  }

  @Get('latest-claims/:clientId')
  @ApiOperation({
    summary: 'Get list of latest claims for a given client',
  })
  @ApiOkResponse({
    description: 'List of latest claims for a given client',
    type: GetClientStorageProvidersResponse,
  })
  public async getClientLatestClaims(
    @Param('clientId') clientId: string,
    @Query() query: GetClientLatestClaimRequest,
  ): Promise<{ data: ClientLatestClaim[] }> {
    const clientClaims = await this.clientService.getClientLatestClaims(
      clientId,
      query,
    );

    return { data: clientClaims };
  }
}
