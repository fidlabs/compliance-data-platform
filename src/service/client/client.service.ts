import { Prisma } from 'prisma/generated/client';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { PrismaDmobService } from 'src/db/prismaDmob.service';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cacheable } from 'src/utils/cacheable';
import {
  ClientBookkeepingInfo,
  ClientWithAllowance,
  ClientWithBookkeeping,
} from './types.client';
import {
  getClientData,
  getClientsByAllocator,
} from 'prismaDmob/generated/client/sql';

@Injectable()
export class ClientService {
  private readonly logger = new Logger(ClientService.name);

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

  public async getClientBookkeepingInfo(
    clientIdOrAddress: string,
  ): Promise<ClientBookkeepingInfo | null> {
    const result =
      await this.prismaService.allocator_client_bookkeeping.findFirst({
        select: {
          bookkeeping_info: true,
        },
        where: {
          OR: [
            {
              client_address: clientIdOrAddress,
            },
            {
              client_id: clientIdOrAddress,
            },
          ],
        },
      });

    if (!result) return null;

    return this._mapClientBookkeeping(
      result.bookkeeping_info as Prisma.JsonObject,
    );
  }

  private _mapClientBookkeeping(
    info: Prisma.JsonObject,
  ): ClientBookkeepingInfo {
    const isPublicDataset = ((): boolean | null => {
      try {
        const publicDatasetKey =
          'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)';

        const publicDatasetStr = (info.Project?.[publicDatasetKey] as string)
          ?.trim()
          ?.toLowerCase();

        return (
          publicDatasetStr.includes('[x]') || publicDatasetStr.includes('yes')
        );
      } catch (err) {
        this.logger.warn(
          `Failed to read public dataset info from bookkeeping info: ${err.message}`,
          err.cause || err.stack,
        );

        return null;
      }
    })();

    const storageProviderIDsDeclared = ((): string[] => {
      try {
        const spsDeclaredKey =
          'Please list the provider IDs and location of the storage providers you will be working with. Note that it is a requirement to list a minimum of 5 unique provider IDs, and that your client address will be verified against this list in the future';

        return (
          (info.Project?.[spsDeclaredKey] as string)
            ?.trim()
            ?.toLowerCase()
            ?.match(/f0\d+/g) ?? []
        );
      } catch (err) {
        this.logger.warn(
          `Failed to read sps provided info from bookkeeping info: ${err.message}`,
          err.cause || err.stack,
        );

        return [];
      }
    })();

    const clientContractAddress = ((): string | null => {
      const clientContractKey = 'Client Contract Address';

      return info[clientContractKey]
        ? (info[clientContractKey] as string)
        : null;
    })();

    return {
      isPublicDataset,
      clientContractAddress,
      storageProviderIDsDeclared,
    };
  }

  public async getClientsBookkeepingInfo(): Promise<ClientWithBookkeeping[]> {
    const result =
      await this.prismaService.allocator_client_bookkeeping.findMany();

    return result.map((row) => ({
      allocatorId: row.allocator_id,
      clientId: row.client_id,
      clientAddress: row.client_address,
      bookkeepingInfo: this._mapClientBookkeeping(
        row.bookkeeping_info as Prisma.JsonObject,
      ),
    }));
  }
}
