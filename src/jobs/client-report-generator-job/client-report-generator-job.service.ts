import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { PrometheusMetricService } from 'src/prometheus';
import { ClientReportService } from 'src/service/client-report/client-report.service';
import { ClientService } from 'src/service/client/client.service';
import { ClientWithBookkeeping } from 'src/service/client/types.client';

@Injectable()
export class ClientReportGeneratorJobService extends HealthIndicator {
  private readonly logger = new Logger(ClientReportGeneratorJobService.name);
  private lastRun: Date = null;
  private lastRunReports: number = null;
  private lastRunFails: number = null;
  private healthy = true;

  constructor(
    private readonly clientService: ClientService,
    private readonly clientReportService: ClientReportService,
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

  private async generateClientReport(application: ClientWithBookkeeping) {
    if (!application.clientId) {
      throw new Error(`Filecoin Id not found`);
    }

    if (
      !(await this.clientReportService.generateReport(application.clientId))
    ) {
      throw new Error(`Client not found`);
    }
  }

  private async _runClientReportGeneration() {
    const applications = await this.clientService.getClientsBookkeepingInfo();
    let fails = 0;

    for (const [i, application] of applications.entries()) {
      try {
        this.logger.debug(
          `Starting generation of client report for application ${application.clientAddress}`,
        );

        await this.generateClientReport(application);
      } catch (err) {
        fails++;
        this.logger.error(
          `Error during generation of client report for application ${application.clientAddress}: ${err.message}`,
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
        `Error during client reports generation job: ${err.message}`,
        err.cause?.stack || err.stack,
      );
    }
  }
}
