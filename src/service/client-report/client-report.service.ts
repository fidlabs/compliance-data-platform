import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { DataCapStatsService } from '../datacapstats/datacapstats.service';
import { OctokitService } from '../octokit/octokit.service';
import { DateTime } from 'luxon';
import { ProteusShieldService } from '../proteus-shield/proteus-shield.service';
import { LocationService } from '../location/location.service';
import { IPResponse } from '../location/types.location';
import { AllocatorTechService } from '../allocator-tech/allocator-tech.service';
import { AllocatorTechApplicationsResponse } from '../allocator-tech/types.allocator-tech';

@Injectable()
export class ClientReportService {
  private readonly logger = new Logger(ClientReportService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly dataCapStatsService: DataCapStatsService,
    private readonly octokitService: OctokitService,
    private readonly proteusShieldService: ProteusShieldService,
    private readonly locationService: LocationService,
    private readonly allocatorTechService: AllocatorTechService,
  ) {}

  async generateReport(client: string) {
    const application = await this.allocatorTechService.getApplication(client);

    const approvers = application ? await this.getApprovers(application) : [];

    const verifiedClientResponse =
      await this.dataCapStatsService.fetchClientDetails(client);

    const verifiedClientData =
      this.dataCapStatsService.findPrimaryClientDetails(
        verifiedClientResponse.data,
      );

    const storageProviderDistribution =
      await this.getStorageProviderDistributionWithLocation(client);

    const replicaDistribution = await this.getReplicationDistribution(client);

    const cidSharing = await this.getCidSharing(client);

    await this.prismaService.client_report.create({
      data: {
        client: client,
        client_address: verifiedClientData?.address,
        organization_name:
          (verifiedClientData?.name ?? '') +
          (verifiedClientData?.orgName ?? ''),
        approvers: {
          create: approvers?.map((approver) => {
            return {
              name: approver[0],
              number: approver[1],
            };
          }),
        },
        storage_provider_distribution: {
          create: storageProviderDistribution?.map(
            (storageProviderDistribution) => {
              return {
                provider: storageProviderDistribution.provider,
                unique_data_size: storageProviderDistribution.unique_data_size,
                total_deal_size: storageProviderDistribution.total_deal_size,
                ...(storageProviderDistribution.location && {
                  location: {
                    create: storageProviderDistribution.location,
                  },
                }),
              };
            },
          ),
        },
        replica_distribution: {
          create: replicaDistribution,
        },
        cid_sharing: {
          create: cidSharing,
        },
      },
    });
  }

  private async getApprovers(
    application: AllocatorTechApplicationsResponse,
  ): Promise<[string, number][]> {
    const [gitHubOwner, gitHubRepository, issueNumber] =
      this.allocatorTechService.getGitHubOwnerRepoAndIssueNumber(application);

    const params = {
      owner: gitHubOwner,
      repo: gitHubRepository,
      issue_number: issueNumber,
      per_page: 100,
    };

    let comments: any[];
    try {
      comments = await this.octokitService.octokit.paginate(
        'GET /repos/{owner}/{repo}/issues/{issue_number}/comments',
        params,
      );
    } catch (error) {
      this.logger.error(
        `Error getting GitHub comments: ${JSON.stringify(error)}`,
      );
      comments = [];
    }

    const approvers = new Map<string, number>();
    for (const comment of comments) {
      if (
        comment.body?.startsWith('## Request Approved') === true ||
        comment.body?.startsWith('## Request Proposed') === true
      ) {
        const approver = comment.user?.login ?? 'Unknown';
        const count = approvers.get(approver) ?? 0;
        approvers.set(approver, count + 1);
      }
    }
    return [...approvers.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }

  private async getStorageProviderDistributionWithLocation(client: string) {
    const lastWeek = DateTime.now()
      .toUTC()
      .minus({ week: 1 })
      .startOf('week')
      .toJSDate();

    const clientProviderDistribution =
      await this.prismaService.client_provider_distribution_weekly.findMany({
        where: {
          client: client,
          week: lastWeek,
        },
      });

    return await Promise.all(
      clientProviderDistribution.map(async (clientProviderDistribution) => ({
        ...clientProviderDistribution,
        location: await this.getClientProviderDistributionLocation(
          clientProviderDistribution,
        ),
      })),
    );
  }

  private async getClientProviderDistributionLocation(clientProviderDistribution: {
    week: Date;
    client: string;
    provider: string;
    total_deal_size: bigint;
    unique_data_size: bigint;
  }): Promise<IPResponse | null> {
    const minerInfo = await this.proteusShieldService.getMinerInfo(
      clientProviderDistribution.provider,
    );

    return await this.locationService.getLocation(minerInfo.result.Multiaddrs);
  }

  private async getReplicationDistribution(client: string) {
    const distribution =
      await this.prismaService.client_replica_distribution.findMany({
        where: {
          client: client,
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

  private async getCidSharing(client: string) {
    return this.prismaService.cid_sharing.findMany({
      where: {
        client: client,
      },
      omit: {
        client: true,
      },
    });
  }
}
