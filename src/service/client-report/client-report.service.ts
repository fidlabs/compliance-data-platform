import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { DataCapStatsService } from '../datacapstats/datacapstats.service';
import { VerifiedClientData } from '../datacapstats/types.datacapstats';
import { OctokitService } from '../octokit/octokit.service';
import { DateTime } from 'luxon';
import { ProteusShieldService } from '../proteus-shield/proteus-shield.service';
import { LocationService } from '../location/location.service';
import { IPResponse } from '../location/types.location';

@Injectable()
export class ClientReportService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly dataCapStatsService: DataCapStatsService,
    private readonly octokitService: OctokitService,
    private readonly proteusShieldService: ProteusShieldService,
    private readonly locationService: LocationService,
  ) {}

  async generateReport(client: string, owner: string, repo: string) {
    const verifiedClientResponse =
      await this.dataCapStatsService.fetchClientDetails(client);

    const verifiedClientData =
      this.dataCapStatsService.findPrimaryClientDetails(
        verifiedClientResponse.data,
      );

    const approvers = await this.getApprovers(verifiedClientData, owner, repo);

    const storageProviderDistribution =
      await this.getStorageProviderDistributionWithLocation(client);

    await this.prismaService.client_report.create({
      data: {
        client: client,
        client_address: verifiedClientData.address,
        organization_name:
          (verifiedClientData.name ?? '') + (verifiedClientData.orgName ?? ''),
        approvers: {
          create: approvers.map((approver) => {
            return {
              name: approver[0],
              number: approver[1],
            };
          }),
        },
        storage_provider_distribution: {
          create: storageProviderDistribution.map(
            (storageProviderDistribution) => {
              return {
                provider: storageProviderDistribution.provider,
                unique_data_size: storageProviderDistribution.unique_data_size,
                total_deal_size: storageProviderDistribution.total_deal_size,
                location: {
                  create: storageProviderDistribution.location,
                },
              };
            },
          ),
        },
      },
    });
  }

  private async getApprovers(
    verifiedClientData: VerifiedClientData,
    owner: string,
    repo: string,
  ): Promise<[string, number][]> {
    const gitHubIssueNumber =
      this.dataCapStatsService.findGitHubIssueNumber(verifiedClientData);
    if (!gitHubIssueNumber) return;

    const params = {
      owner: owner,
      repo: repo,
      issue_number: gitHubIssueNumber,
      per_page: 100,
    };

    const comments = await this.octokitService.octokit.paginate(
      'GET /repos/{owner}/{repo}/issues/{issue_number}/comments',
      params,
    );

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
}
