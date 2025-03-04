import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { PrometheusMetricService } from 'src/prometheus';
import { AllocatorTechService } from 'src/service/allocator-tech/allocator-tech.service';
import { AllocatorTechApplicationResponse } from 'src/service/allocator-tech/types.allocator-tech';
import { ClientReportService } from 'src/service/client-report/client-report.service';
import { LotusApiService } from 'src/service/lotus-api/lotus-api.service';

@Injectable()
export class ClientReportGeneratorJobService extends HealthIndicator {
  private readonly logger = new Logger(ClientReportGeneratorJobService.name);
  private lastRun: Date = null;
  private lastRunReports: number = null;
  private lastRunFails: number = null;
  private healthy = true;

  constructor(
    private readonly allocatorTechService: AllocatorTechService,
    private readonly clientReportService: ClientReportService,
    private readonly lotusApiService: LotusApiService,
    private readonly prometheusMetricService: PrometheusMetricService,
  ) {
    super();
  }

  public async getHealth(): Promise<HealthIndicatorResult> {
    const result = this.getStatus(
      ClientReportGeneratorJobService.name,
      this.healthy,
      {
        lastRun: this.lastRun,
        lastRunReports: this.lastRunReports,
        lastRunFails: this.lastRunFails,
      },
    );

    if (this.healthy) return result;
    throw new HealthCheckError('Healthcheck failed', result);
  }

  private async generateClientReport(
    application: AllocatorTechApplicationResponse,
  ) {
    // find Filecoin Client ID
    const filecoinId = await this.lotusApiService.getFilecoinClientId(
      application.ID,
    );

    if (!filecoinId) {
      throw new Error(`Filecoin Id not found`);
    }

    if (!(await this.clientReportService.generateReport(filecoinId))) {
      throw new Error(`Client not found`);
    }
  }

  private async _runClientReportGeneration() {
    const applications = await this.allocatorTechService.getApplications();
    let fails = 0;

    for (const [i, application] of applications.entries()) {
      try {
        this.logger.debug(
          `Starting generation of client report for application ${application.ID}`,
        );

        await this.generateClientReport(application);
      } catch (err) {
        fails++;
        this.logger.error(
          `Error during generation of client report for application ${application.ID}: ${err}`,
        );

        await new Promise((resolve) => setTimeout(resolve, 1000 * 60)); // 1 minute
      }

      if (i > 0 && i % 50 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * 60)); // 1 minute
      }
    }

    return { reports: applications.length, fails: fails };
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  public async runClientReportGenerationJob() {
    try {
      this.logger.log('Starting client reports generation');
      this.lastRun = new Date();
      this.healthy = true;

      const { reports, fails } = await this._runClientReportGeneration();

      this.lastRunReports = reports;
      this.lastRunFails = fails;
      this.logger.log(
        `Finishing client reports generation. Fails: ${fails} / ${reports}`,
      );

      this.prometheusMetricService.clientReportGeneratorMetrics.setSuccessReportsCountMetric(
        reports - fails,
      );

      this.prometheusMetricService.clientReportGeneratorMetrics.setFailReportsCountMetric(
        fails,
      );
    } catch (err) {
      this.healthy = false;
      this.logger.error(
        `Error during client reports generation job: ${err}`,
        err.stack,
      );
    }
  }
}
