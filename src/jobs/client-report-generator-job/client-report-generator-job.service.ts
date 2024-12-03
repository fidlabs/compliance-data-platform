import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AllocatorTechService } from '../../service/allocator-tech/allocator-tech.service';
import { ClientReportService } from '../../service/client-report/client-report.service';
import { LotusApiService } from '../../service/lotus-api/lotus-api.service';
import { AllocatorTechApplicationsResponse } from '../../service/allocator-tech/types.allocator-tech';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';

@Injectable()
export class ClientReportGeneratorJobService extends HealthIndicator {
  private readonly logger = new Logger(ClientReportGeneratorJobService.name);
  private lastRun: Date = null;
  private lastRunApplications = 0;
  private lastRunFails = 0;
  private healthy = true;

  constructor(
    private readonly allocatorTechService: AllocatorTechService,
    private readonly clientReportService: ClientReportService,
    private readonly lotusApiService: LotusApiService,
  ) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    const result = this.getStatus('client-report-generator', this.healthy, {
      lastRun: this.lastRun,
      lastRunApplications: this.lastRunApplications,
      lastRunFails: this.lastRunFails,
    });

    if (this.healthy) return result;
    throw new HealthCheckError('Healthcheck failed', result);
  }

  private async _generateClientReport(
    application: AllocatorTechApplicationsResponse,
  ) {
    // find Filecoin Client ID
    const filecoinId = await this.lotusApiService.getFilecoinClientId(
      application[0].ID,
    );

    if (!filecoinId) {
      throw new Error(`Filecoin Id not found`);
    }

    if (!(await this.clientReportService.generateReport(filecoinId))) {
      throw new Error(`client not found`);
    }
  }

  private async _runClientReportGeneration() {
    const applications = await this.allocatorTechService.getApplications();
    let fails = 0;

    for (const [i, application] of applications.entries()) {
      try {
        this.logger.debug(
          `Starting generation of Client Report for application #${application[0].ID}`,
        );

        await this._generateClientReport(application);
      } catch (err) {
        fails++;
        this.logger.error(
          `Error during generation of Client Report for application #${application[0].ID}: ${err}`,
          err,
        );
      }

      if (i > 0 && i % 50 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * 60)); // 1 minute
      }
    }

    return { applications: applications.length, fails: fails };
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async runClientReportGenerationJob() {
    try {
      this.logger.log('Starting Client Reports generation');
      this.lastRun = new Date();

      const { applications, fails } = await this._runClientReportGeneration();

      this.lastRunApplications = applications;
      this.lastRunFails = fails;
      this.healthy = true;
      this.logger.log(
        `Finishing Client Reports generation. Fails: ${fails} / ${applications}`,
      );
    } catch (err) {
      this.healthy = false;
      this.logger.error(
        `Error during Client Reports generation job: ${err}`,
        err,
      );
    }
  }
}
