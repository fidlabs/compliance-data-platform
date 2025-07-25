import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { PrometheusMetricService } from 'src/prometheus';
import { AllocatorReportService } from 'src/service/allocator-report/allocator-report.service';
import { GitHubAllocatorRegistryService } from 'src/service/github-allocator-registry/github-allocator-registry.service';
import { sleep } from 'src/utils/utils';

@Injectable()
export class AllocatorReportGeneratorJobService extends HealthIndicator {
  private readonly logger = new Logger(AllocatorReportGeneratorJobService.name);
  private lastRun: Date = null;
  private lastRunReports: number = null;
  private lastRunFails: number = null;
  private healthy = true;

  constructor(
    private readonly allocatorRegistryService: GitHubAllocatorRegistryService,
    private readonly allocatorReportService: AllocatorReportService,
    private readonly prometheusMetricService: PrometheusMetricService,
  ) {
    super();
  }

  public async getHealth(): Promise<HealthIndicatorResult> {
    const result = this.getStatus(
      AllocatorReportGeneratorJobService.name,
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

  private async generateAllocatorReport(allocatorAddress: string) {
    if (!(await this.allocatorReportService.generateReport(allocatorAddress))) {
      throw new Error(`Allocator not found`);
    }
  }

  private async _runAllocatorReportGeneration() {
    const allocators =
      await this.allocatorRegistryService.getAllocatorsRegistry();

    const allocatorsAddresses = [
      ...new Set(allocators.map((allocator) => allocator.allocator_address)),
    ];

    let fails = 0;

    for (const allocatorAddress of allocatorsAddresses) {
      try {
        this.logger.debug(
          `Starting generation of allocator report for ${allocatorAddress}`,
        );

        await this.generateAllocatorReport(allocatorAddress);
      } catch (err) {
        fails++;
        this.logger.error(
          `Error during generation of allocator report for ${allocatorAddress}: ${err.message}`,
          err.cause?.stack || err.stack,
        );

        await sleep(1000 * 60); // 1 minute
      }
    }

    return { reports: allocatorsAddresses.length, fails: fails };
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
        `Error during allocator reports generation job: ${err.message}`,
        err.cause?.stack || err.stack,
      );
    }
  }
}
