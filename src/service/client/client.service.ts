import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';

@Injectable()
export class ClientService {
  constructor(private readonly prismaService: PrismaService) {}

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
}
