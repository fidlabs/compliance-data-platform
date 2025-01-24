import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { PrometheusMetricService } from 'src/common/prometheus';
import { AllocatorTechService } from '../../service/allocator-tech/allocator-tech.service';
import { AllocatorReportService } from '../../service/allocator-report/allocator-report.service';

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

  async isHealthy(): Promise<HealthIndicatorResult> {
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
    const allocators = await this.allocatorTechService.getNonZeroAllocators();
    let fails = 0;

    for (const [, allocator] of allocators.entries()) {
      try {
        this.logger.debug(
          `Starting generation of Allocator Report for ${allocator.address}`,
        );

        await this.generateAllocatorReport(allocator.address);
      } catch (err) {
        fails++;
        this.logger.error(
          `Error during generation of Allocator Report for ${allocator.address}: ${err}`,
          err.stack,
        );

        await new Promise((resolve) => setTimeout(resolve, 1000 * 60)); // 1 minute
      }
    }

    return { reports: allocators.length, fails: fails };
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async runAllocatorReportGenerationJob() {
    try {
      this.logger.log('Starting Allocator Reports generation');
      this.lastRun = new Date();
      this.healthy = true;

      const { reports, fails } = await this._runAllocatorReportGeneration();

      this.lastRunReports = reports;
      this.lastRunFails = fails;
      this.logger.log(
        `Finishing Allocator Reports generation. Fails: ${fails} / ${reports}`,
      );

      this.prometheusMetricService.setSuccessAllocatorReportsMetric(
        reports - fails,
      );

      this.prometheusMetricService.setFailAllocatorReportsMetric(fails);
    } catch (err) {
      this.healthy = false;
      this.logger.error(
        `Error during Allocator Reports generation job: ${err}`,
        err.stack,
      );
    }
  }
}
