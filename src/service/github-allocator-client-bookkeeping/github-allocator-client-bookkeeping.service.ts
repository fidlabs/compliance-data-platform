import { Injectable, Logger } from '@nestjs/common';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/core';
import { ConfigService } from '@nestjs/config';
import { LotusApiService } from '../lotus-api/lotus-api.service';
import { AllocatorClientBookkeeping } from './types.github-allocator-client-bookkeeping';
import * as _ from 'lodash';

@Injectable()
export class GitHubAllocatorClientBookkeepingService {
  private readonly logger = new Logger(
    GitHubAllocatorClientBookkeepingService.name,
  );

  private octokit = new Map<string, Octokit>();

  constructor(
    private readonly configService: ConfigService,
    private readonly lotusApiService: LotusApiService,
  ) {}

  public isInitialized(): boolean {
    return (
      !!this.configService.get<string>('GITHUB_APP_ID') &&
      !!this.configService.get<string>('GITHUB_PRIVATE_KEY')
    );
  }

  private async getInstallationId(owner, repo): Promise<number> {
    const appOctokit = await this._getAppOctokit();

    const response = await appOctokit.request(
      'GET /repos/{owner}/{repo}/installation',
      {
        owner,
        repo,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );

    return response.data.id;
  }

  private async _getAppOctokit(installationId?: number): Promise<Octokit> {
    const auth: any = {
      appId: this.configService.get<string>('GITHUB_APP_ID'),
      privateKey: this.configService.get<string>('GITHUB_PRIVATE_KEY'),
    };

    if (installationId) auth.installationId = installationId;

    return new Octokit({
      authStrategy: createAppAuth,
      auth,
    });
  }

  private async getOctokit(owner, repo): Promise<Octokit> {
    const key = `${owner}/${repo}`;

    if (!this.octokit[key]) {
      const pat = this.configService.get<string>('GITHUB_PAT');

      if (pat) {
        this.octokit[key] = new Octokit({
          auth: pat,
        });
      } else {
        this.octokit[key] = await this._getAppOctokit(
          await this.getInstallationId(owner, repo),
        );
      }
    }

    return this.octokit[key];
  }

  public async getAllocatorsClientBookkeeping(
    owner,
    repo,
  ): Promise<AllocatorClientBookkeeping[]> {
    let octokit;
    let response;

    try {
      octokit = await this.getOctokit(owner, repo);
      response = (await octokit.request(
        'GET /repos/{owner}/{repo}/contents/{path}',
        {
          owner,
          repo,
          path: 'applications',
          headers: {
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      )) as any;
    } catch (err) {
      this.logger.warn(
        `Error fetching applications for ${owner}/${repo}: ${err.message}`,
        // err.cause || err.stack,
      );

      return [];
    }

    const paths = response.data
      .filter((v) => v.name.endsWith('.json'))
      .map((v) => v.path);

    const clients = [];
    const chunks = _.chunk(paths, 10);

    for (const chunk of chunks) {
      await Promise.allSettled(
        chunk.map(async (path: string) => {
          try {
            const info = await this.getClientInfo(owner, repo, path);
            if (info) clients.push(info);
          } catch (err) {
            this.logger.warn(
              `Error while fetching client info for ${owner}/${repo}:${path}: ${err.message}`,
              // err.cause || err.stack,
            );
          }
        }),
      );
    }

    return clients;
  }

  private async getClientInfo(
    owner: string,
    repo: string,
    path: string,
  ): Promise<AllocatorClientBookkeeping | null> {
    const octokit = await this.getOctokit(owner, repo);

    const file = (await octokit.request(
      'GET /repos/{owner}/{repo}/contents/{path}',
      {
        owner,
        repo,
        path: path,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    )) as any;

    const data = JSON.parse(atob(file.data.content));

    // TODO get rid of lotusApiService.getFilecoinId?
    const id = await this.lotusApiService.getFilecoinId(data.ID);

    if (!id) {
      this.logger.warn(
        `No ID for address ${data.ID} (${owner}/${repo}:${path})`,
      );

      return null;
    }

    return {
      clientId: id,
      clientAddress: data.ID,
      jsonPath: path,
      bookkeepingInfo: data,
    };
  }
}
