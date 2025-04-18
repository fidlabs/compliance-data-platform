import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { PrismaDmobService } from 'src/db/prismaDmob.service';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cacheable } from 'src/utils/cacheable';
import { ClientWithAllowance } from './types.client';
import {
  getClientData,
  getClientsByAllocator,
} from 'prismaDmob/generated/client/sql';

@Injectable()
export class ClientService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly prismaDmobService: PrismaDmobService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  public getClientApplicationUrl(clientData?: {
    allowanceArray: {
      auditTrail: string | null;
    }[];
  }): string | null {
    let applicationUrl = clientData?.allowanceArray?.[0]?.auditTrail;
    if (applicationUrl === 'n/a') applicationUrl = null;
    return applicationUrl;
  }

  public async getReplicationDistribution(clientId: string) {
    const distribution =
      await this.prismaService.client_replica_distribution.findMany({
        where: {
          client: clientId,
        },
        omit: {
          client: true,
        },
      });

    const total = distribution.reduce(
      (acc, cur) => acc + cur.total_deal_size,
      0n,
    );

    return distribution?.map((distribution) => ({
      ...distribution,
      percentage: Number((distribution.total_deal_size * 10000n) / total) / 100,
    }));
  }

  @Cacheable() // cache forever
  public async getClientIdByAddress(
    clientAddress: string,
  ): Promise<string | null> {
    return (
      (
        await this.prismaDmobService.verified_client.findFirst({
          where: {
            address: clientAddress,
          },
          select: {
            addressId: true,
          },
        })
      )?.addressId ?? null
    );
  }

  public async getCidSharing(clientId: string) {
    return this.prismaService.cid_sharing.findMany({
      where: {
        client: clientId,
      },
      omit: {
        client: true,
      },
    });
  }

  public async getClientsByAllocator(
    allocatorId: string,
  ): Promise<ClientWithAllowance[]> {
    return (
      await this.prismaDmobService.$queryRawTyped(
        getClientsByAllocator(allocatorId),
      )
    ).map((r) => ({
      allowanceArray: r._allowanceArray as [],
      ...r,
    }));
  }

  public async getClientData(
    clientIdOrAddress: string,
  ): Promise<ClientWithAllowance[]> {
    return (
      await this.prismaDmobService.$queryRawTyped(
        getClientData(clientIdOrAddress),
      )
    ).map((r) => ({
      allowanceArray: r._allowanceArray as [],
      ...r,
    }));
  }
}
