import { Injectable, Logger } from '@nestjs/common';
import { GitHubIssueParserService } from '../github-issue-parser/github-issue-parser.service';
import { ClientService } from '../client/client.service';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/core';
import { ClientReportService } from '../client-report/client-report.service';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';

class GitHubTriggerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = GitHubTriggerError.name;
  }
}

@Injectable()
export class GitHubTriggersHandlerService extends HealthIndicator {
  private readonly logger = new Logger(GitHubTriggersHandlerService.name);
  private healthy = true;

  constructor(
    private readonly gitHubIssueParserService: GitHubIssueParserService,
    private readonly clientService: ClientService,
    private readonly clientReportsService: ClientReportService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  public async getHealth(): Promise<HealthIndicatorResult> {
    const result = this.getStatus(
      GitHubTriggersHandlerService.name,
      this.healthy,
      {},
    );

    if (this.healthy) return result;
    throw new HealthCheckError('Healthcheck failed', result);
  }

  public async handleTrigger(context: any) {
    if (context.action === 'created' && context.comment?.body)
      await this.handleIssueCommentCreated(context);
  }

  private async handleIssueCommentCreated(context: any) {
    let responseBody: string | null;

    try {
      if (context.comment.body.trim() === 'checker:manualTrigger') {
        responseBody = await this.checkerManualTrigger(context);
        this.healthy = true;
      }
    } catch (err) {
      this.healthy = false;
      this.logger.error(
        `Error handling GitHub issue comment created trigger: ${err}`,
        err.stack,
      );

      responseBody = `Error: internal server error`;
    }

    if (responseBody) {
      const response = await this.getOctokit(context).request(
        'POST /repos/{owner}/{repo}/issues/{issue_number}/comments',
        {
          owner: context.repository.owner.login,
          repo: context.repository.name,
          issue_number: context.issue.number,
          body: responseBody,
        },
      );

      this.logger.log(`GitHub issue comment posted: ${response.data.html_url}`);
    }
  }

  private getOctokit(context: any): Octokit {
    return new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: this.configService.get<string>('GITHUB_APP_ID'),
        privateKey: this.configService.get<string>('GITHUB_PRIVATE_KEY'),
        installationId: context.installation.id,
      },
    });
  }

  //

  private async checkerManualTrigger(context: any): Promise<string> {
    try {
      return await this._checkerManualTrigger(context);
    } catch (err) {
      if (err instanceof GitHubTriggerError) {
        this.logger.warn(
          `Error handling checker:manualTrigger trigger: ${err}`,
        );

        return `Error during generation of client report: ${err.message}`;
      }

      throw err;
    }
  }

  private async _checkerManualTrigger(context: any): Promise<string> {
    const clientAddress = await this.gitHubIssueParserService.getClientAddress(
      context.issue,
    );

    if (!clientAddress) {
      throw new GitHubTriggerError(
        `No client address found in GitHub issue: ${context.issue.url}`,
      );
    }

    const clientId =
      await this.clientService.getClientIdByAddress(clientAddress);

    if (!clientId) {
      throw new GitHubTriggerError(
        `Client ID not found for address: ${clientAddress}`,
      );
    }

    let clientReport = await this.clientReportsService.getLatestReport(
      clientId,
      true,
    );

    if (
      !clientReport ||
      new Date().getTime() - clientReport.create_date.getTime() >
        1000 * 60 * 60 * 30 // report older than 30 hours (24 hours + some buffer)
    ) {
      clientReport = await this.clientReportsService.generateReport(
        clientId,
        true,
      );
    }

    if (!clientReport) {
      throw new GitHubTriggerError(
        `Client not found: address: ${clientAddress}, ID: ${clientId}`,
      );
    }

    const responseLines: string[] = [];

    // prettier-ignore
    {
      responseLines.push('## DataCap Client Report Summary [^1]');
      responseLines.push(`**Client address:** \`${clientReport.client_address}\``);
      responseLines.push(`**Client ID:** \`${clientReport.client}\``);
      responseLines.push(`**Report ID:** \`${clientReport.id}\``);
      const timeAgoString = this._generateTimeAgoString(clientReport.create_date, new Date());
      responseLines.push(`**Generated at:** ${clientReport.create_date.toUTCString()} (${timeAgoString}) [^2]`);

      responseLines.push('');
      responseLines.push('### Report checks');
      for (const check of clientReport.check_results) {
        responseLines.push(`${check.result ? '✔️ ' : '⚠️'}${check.metadata?.['msg']}`);
        responseLines.push('');
      }

      responseLines.push('');
      responseLines.push('### Full report');
      const reportUrl = `https://datacapstats.io/clients/${clientReport.client}/reports/${clientReport.id}`;
      responseLines.push(`Click [here](${reportUrl}) to view full report`);

      responseLines.push('[^1]: To manually trigger this report, add a comment with text \`checker:manualTrigger\`');
      responseLines.push('[^2]: New report will be generated only if the latest one is older than 30 hours');
    }

    return responseLines.join('\n');
  }

  private _generateTimeAgoString(from: Date, to: Date): string {
    const diff = to.getTime() - from.getTime();

    const minutes = Math.floor(diff / 1000 / 60);
    if (minutes < 5) return 'just now';
    if (minutes < 60) return `${minutes} minutes ago`;

    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
}
