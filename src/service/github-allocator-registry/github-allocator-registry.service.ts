import { Injectable, Logger } from '@nestjs/common';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/core';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { AllocatorRegistry } from './types.github-allocator-registry';
import { envSet } from 'src/utils/utils';
import { AllocatorService } from '../allocator/allocator.service';

@Injectable()
export class GitHubAllocatorRegistryService extends HealthIndicator {
  private readonly logger = new Logger(GitHubAllocatorRegistryService.name);
  private healthy = true;
  private octokit: Octokit;

  constructor(
    private readonly configService: ConfigService,
    private readonly allocatorService: AllocatorService,
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

    const paths = response.data
      .filter(
        (v) => v.name.endsWith('.json') && v.name != 'Allocator JSON SPEC.json',
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
          // err.cause?.stack || err.stack,
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

    const jsonData = JSON.parse(atob(file.data.content));

    const jsonAllocatorAddress =
      jsonData?.pathway_addresses?.msig || jsonData?.address;

    const jsonAllocatorId = jsonData?.allocator_id;

    const dbAllocatorAddress = !jsonAllocatorId
      ? null
      : (await this.allocatorService.getAllocatorData(jsonAllocatorId))
          ?.address;

    const dbAllocatorId = !jsonAllocatorAddress
      ? null
      : (await this.allocatorService.getAllocatorData(jsonAllocatorAddress))
          ?.addressId;

    // double check data integrity
    if (
      jsonAllocatorAddress &&
      dbAllocatorAddress &&
      jsonAllocatorAddress !== dbAllocatorAddress
    ) {
      this.logger.warn(
        `allocator address from json: ${jsonAllocatorAddress} / ${jsonAllocatorId} does not match the database: ${dbAllocatorAddress} for path: ${path}, please investigate`,
      );
    }

    if (jsonAllocatorId && dbAllocatorId && jsonAllocatorId !== dbAllocatorId) {
      this.logger.warn(
        `allocator id from json: ${jsonAllocatorAddress} / ${jsonAllocatorId} does not match the database: ${dbAllocatorId} for path: ${path}, please investigate`,
      );
    }

    // prefer json data over db data
    const allocatorAddress = jsonAllocatorAddress || dbAllocatorAddress;
    const allocatorId = jsonAllocatorId || dbAllocatorId;

    return !allocatorId
      ? null
      : {
          allocator_id: allocatorId,
          allocator_address: allocatorAddress,
          json_path: path,
          registry_info: jsonData,
        };
  }
}
