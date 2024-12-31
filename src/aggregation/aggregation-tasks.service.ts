import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AggregationService } from './aggregation.service';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { PrometheusMetricService } from 'src/common/prometheus';

@Injectable()
export class AggregationTasksService extends HealthIndicator {
  private readonly logger = new Logger(AggregationTasksService.name);
  private aggregationJobInProgress = false;
  private healthy = true;
  private lastSuccess: Date = null;
  private lastRun: Date = null;

  constructor(
    private readonly aggregationService: AggregationService,
    private readonly prometheusMetricService: PrometheusMetricService,
  ) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    const result = this.getStatus('aggregation-tasks', this.healthy, {
      lastSuccess: this.lastSuccess,
      lastRun: this.lastRun,
    });

    if (this.healthy) return result;
    throw new HealthCheckError('Healthcheck failed', result);
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async runAggregationJob() {
    if (!this.aggregationJobInProgress) {
      this.aggregationJobInProgress = true;
      const endEntireAggregationTimer =
        this.prometheusMetricService.startEntireAggregationTimer();

      try {
        this.logger.log('Starting Aggregations');
        this.lastRun = new Date();
        this.healthy = true;

        await this.aggregationService.runAggregations();

        this.lastSuccess = new Date();
        this.logger.log('Finished Aggregations');
      } catch (err) {
        this.healthy = false;
        this.logger.error(`Error during Aggregations job: ${err}`, err.stack);
      } finally {
        endEntireAggregationTimer();
        this.aggregationJobInProgress = false;
      }
    } else {
      this.logger.debug(
        'Aggregations job still in progress - skipping next execution',
      );
    }
  }
}
