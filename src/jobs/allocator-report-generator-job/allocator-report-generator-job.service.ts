import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { PrometheusMetricService } from 'src/prometheus';
import { AllocatorReportService } from 'src/service/allocator-report/allocator-report.service';
import { AllocatorTechService } from 'src/service/allocator-tech/allocator-tech.service';

@Injectable()
export class AllocatorReportGeneratorJobService extends HealthIndicator {
  private readonly logger = new Logger(AllocatorReportGeneratorJobService.name);
  private lastRun: Date = null;
  private lastRunReports: number = null;
  private lastRunFails: number = null;
  private healthy = true;

  constructor(
    private readonly allocatorTechService: AllocatorTechService,
    private readonly allocatorReportService: AllocatorReportService,
    private readonly prometheusMetricService: PrometheusMetricService,
  ) {
    super();
  }

  public async getHealth(): Promise<HealthIndicatorResult> {
    const result = this.getStatus('allocator-report-generator', this.healthy, {
      lastRun: this.lastRun,
      lastRunReports: this.lastRunReports,
      lastRunFails: this.lastRunFails,
    });

    if (this.healthy) return result;
    throw new HealthCheckError('Healthcheck failed', result);
  }

  private async generateAllocatorReport(allocatorAddress: string) {
    if (!(await this.allocatorReportService.generateReport(allocatorAddress))) {
      throw new Error(`Allocator not found`);
    }
  }

  private async _runAllocatorReportGeneration() {
    const allocators = await this.allocatorTechService.getAllocators();
    let fails = 0;

    for (const [, allocator] of allocators.entries()) {
      try {
        this.logger.debug(
          `Starting generation of allocator report for ${allocator.address}`,
        );

        await this.generateAllocatorReport(allocator.address);
      } catch (err) {
        fails++;
        this.logger.error(
          `Error during generation of allocator report for ${allocator.address}: ${err}`,
          err.stack,
        );

        await new Promise((resolve) => setTimeout(resolve, 1000 * 60)); // 1 minute
      }
    }

    return { reports: allocators.length, fails: fails };
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  public async runAllocatorReportGenerationJob() {
    try {
      this.logger.log('Starting allocator reports generation');
      this.lastRun = new Date();
      this.healthy = true;

      const { reports, fails } = await this._runAllocatorReportGeneration();

      this.lastRunReports = reports;
      this.lastRunFails = fails;
      this.logger.log(
        `Finishing allocator reports generation. Fails: ${fails} / ${reports}`,
      );

      this.prometheusMetricService.allocatorReportGeneratorMetrics.setSuccessAllocatorReportsMetric(
        reports - fails,
      );

      this.prometheusMetricService.allocatorReportGeneratorMetrics.setFailAllocatorReportsMetric(
        fails,
      );
    } catch (err) {
      this.healthy = false;
      this.logger.error(
        `Error during allocator reports generation job: ${err}`,
        err.stack,
      );
    }
  }
}
