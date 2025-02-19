import { Inject, Injectable } from '@nestjs/common';
import { Issue } from '@octokit/webhooks-types';
import { Cacheable } from 'src/utils/cacheable';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { ParsedGitHubIssue } from './types.github-issue-parser';

@Injectable()
export class GitHubIssueParserService {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  public getClientAddress(issue: Issue): Promise<string | null> {
    if (!issue.body) return null;

    return this.parseIssueAddress(issue.body);
  }

  private parseIssue(issueContent: string): ParsedGitHubIssue {
    const trimmedIssueContent = issueContent.replace(/(\n)|(\r)/gm, '');

    if (trimmedIssueContent.startsWith('### Version'))
      return this.parseNewLDN(trimmedIssueContent);

    if (trimmedIssueContent.startsWith('### Data Owner Name'))
      return this.parseNewLDN(trimmedIssueContent);

    throw new Error('Issue format not recognized');
  }

  @Cacheable() // cache forever
  private async parseIssueAddress(
    issueContent: string,
  ): Promise<string | null> {
    const address = this.parseIssue(issueContent).address;
    if (!address || !address.startsWith('f')) return null;

    return address;
  }

  private parseNewLDN(trimmedIssueContent: string): ParsedGitHubIssue {
    const newDataKeys: ParsedGitHubIssue = {
      name: 'Data Owner Name',
      region: 'Data Owner Country/Region',
      website: 'Website',
      datacapRequested: 'Total amount of DataCap being requested',
      dataCapWeeklyAllocation: 'Weekly allocation of DataCap requested',
      address: 'On-chain address for first allocation',
      isCustomNotary: 'Custom multisig',
      identifier: 'Identifier',
      dataType: 'Data Type of Application',
    };

    const isCustomNotaryRegex = /- \[x] Use Custom Multisig/gi;
    const parsedData: ParsedGitHubIssue = {};

    for (const [dataKey, dataKeyString] of Object.entries(newDataKeys)) {
      const dataKeyStringRegExp = new RegExp(`(?<=${dataKeyString})(.*?)(?=#)`);
      const matched = trimmedIssueContent.match(dataKeyStringRegExp);

      parsedData[dataKey] = matched?.[0]?.trim();

      if (dataKey === 'isCustomNotary') {
        parsedData[dataKey] = isCustomNotaryRegex
          .test(parsedData[dataKey])
          .toString();
      }
    }

    return parsedData;
  }
}
