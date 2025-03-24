import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { PrometheusMetricService } from 'src/prometheus';
import { AggregationService } from './aggregation.service';

@Injectable()
export class AggregationTasksService extends HealthIndicator {
  private readonly logger = new Logger(AggregationTasksService.name);
  private jobInProgress = false;
  private healthy = true;
  private lastSuccess: Date = null;
  private lastRun: Date = null;

  constructor(
    private readonly aggregationService: AggregationService,
    private readonly prometheusMetricService: PrometheusMetricService,
  ) {
    super();
  }

  public async getHealth(): Promise<HealthIndicatorResult> {
    const result = this.getStatus(AggregationTasksService.name, this.healthy, {
      lastSuccess: this.lastSuccess,
      lastRun: this.lastRun,
    });

    if (this.healthy) return result;
    throw new HealthCheckError('Healthcheck failed', result);
  }

  @Cron(CronExpression.EVERY_HOUR)
  public async runAggregationJob() {
    if (!this.jobInProgress) {
      this.jobInProgress = true;
      const endAllAggregationsTimer =
        this.prometheusMetricService.aggregateMetrics.startAggregateTimer();

      try {
        this.logger.log('Starting aggregations');
        this.lastRun = new Date();
        this.healthy = true;

        await this.aggregationService.runAggregations();

        this.lastSuccess = new Date();
        this.logger.log('Finished aggregations');
      } catch (err) {
        this.healthy = false;
        this.logger.error(
          `Error during aggregations job: ${err.message}`,
          err.cause || err.stack,
        );
      } finally {
        endAllAggregationsTimer();
        this.jobInProgress = false;
      }
    } else {
      this.logger.warn(
        'Aggregations job still in progress - skipping next execution',
      );
    }
  }
}
