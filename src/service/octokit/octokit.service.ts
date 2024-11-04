import { Injectable, OnModuleInit } from '@nestjs/common';
import { Octokit } from '@octokit/core';
import { PaginateInterface, paginateRest } from '@octokit/plugin-paginate-rest';

@Injectable()
export class OctokitService implements OnModuleInit {
  octokit: Octokit & { paginate: PaginateInterface };

  async onModuleInit() {
    const MyOctokit = Octokit.plugin(paginateRest);
    this.octokit = new MyOctokit({});
  }
}
