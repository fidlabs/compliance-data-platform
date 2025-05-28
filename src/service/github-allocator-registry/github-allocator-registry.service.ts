import { Injectable, Logger } from '@nestjs/common';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/core';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { LotusApiService } from '../lotus-api/lotus-api.service';
import { AllocatorRegistry } from './types.github-allocator-registry';
import { envSet } from 'src/utils/utils';

@Injectable()
export class GitHubAllocatorRegistryService extends HealthIndicator {
  private readonly logger = new Logger(GitHubAllocatorRegistryService.name);
  private healthy = true;
  private octokit: Octokit;

  constructor(
    private readonly configService: ConfigService,
    private readonly lotusApiService: LotusApiService,
  ) {
    super();
  }

  public async getHealth(): Promise<HealthIndicatorResult> {
    const result = this.getStatus(
      GitHubAllocatorRegistryService.name,
      this.healthy,
      {},
    );

    if (this.healthy) return result;
    throw new HealthCheckError('Healthcheck failed', result);
  }

  public isInitialized(): boolean {
    return (
      envSet('ALLOCATOR_REGISTRY_REPO_OWNER') &&
      envSet('ALLOCATOR_REGISTRY_REPO_NAME') &&
      envSet('GITHUB_APP_ID') &&
      envSet('GITHUB_PRIVATE_KEY')
    );
  }

  private async getInstallationId(): Promise<number> {
    const appOctokit = await this._getAppOctokit();

    const response = await appOctokit.request(
      'GET /repos/{owner}/{repo}/installation',
      {
        owner: this.configService.get<string>('ALLOCATOR_REGISTRY_REPO_OWNER'),
        repo: this.configService.get<string>('ALLOCATOR_REGISTRY_REPO_NAME'),
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

  private async getOctokit(): Promise<Octokit> {
    if (!this.octokit) {
      const pat = this.configService.get<string>('GITHUB_PAT');
      if (pat) {
        this.octokit = new Octokit({
          auth: pat,
        });
      } else {
        this.octokit = await this._getAppOctokit(
          await this.getInstallationId(),
        );
      }
    }

    return this.octokit;
  }

  public async getAllocatorsRegistry(): Promise<AllocatorRegistry[]> {
    const octokit = await this.getOctokit();
    let response;

    try {
      this.healthy = true;

      response = (await octokit.request(
        'GET /repos/{owner}/{repo}/contents/{path}',
        {
          owner: this.configService.get<string>(
            'ALLOCATOR_REGISTRY_REPO_OWNER',
          ),
          repo: this.configService.get<string>('ALLOCATOR_REGISTRY_REPO_NAME'),
          path: 'Allocators',
          headers: {
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      )) as any;
    } catch (err) {
      this.healthy = false;
      throw new Error(`Error fetching allocators registry: ${err.message}`, {
        cause: err,
      });
    }

    const isNumericalString = (str?: string) => {
      return parseInt(str).toString() === str;
    };

    const paths = response.data
      // filter only old scheme json files
      .filter(
        (v) =>
          v.name.endsWith('.json') &&
          isNumericalString(v.name.substring(0, v.name.length - 5)),
      )
      .map((v) => v.path);

    const registry = [];

    for (const path of paths) {
      try {
        const info = await this.getAllocatorInfo(path);
        if (info) registry.push(info);
      } catch (err) {
        this.logger.warn(
          `Error while fetching registry info for ${path}: ${err.message}`,
          // err.cause || err.stack,
        );
      }
    }

    return registry;
  }

  private async getAllocatorInfo(
    path: string,
  ): Promise<AllocatorRegistry | null> {
    const octokit = await this.getOctokit();

    const file = (await octokit.request(
      'GET /repos/{owner}/{repo}/contents/{path}',
      {
        owner: this.configService.get<string>('ALLOCATOR_REGISTRY_REPO_OWNER'),
        repo: this.configService.get<string>('ALLOCATOR_REGISTRY_REPO_NAME'),
        path: path,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    )) as any;

    const data = JSON.parse(atob(file.data.content));

    if (!data?.pathway_addresses?.msig) {
      this.logger.warn(`No msig address for ${path}`);
      return null;
    }

    // TODO use allocatorService.getAllocatorData(...).address here, get rid of lotusApiService.getFilecoinId?
    const id = await this.lotusApiService.getFilecoinId(
      data.pathway_addresses.msig,
    );

    if (!id) {
      this.logger.warn(
        `No ID for address ${data.pathway_addresses.msig} (${path})`,
      );

      return null;
    }

    return {
      allocator_id: id,
      allocator_address: data.pathway_addresses.msig,
      json_path: path,
      registry_info: data,
    };
  }
}
