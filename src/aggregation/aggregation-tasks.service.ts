import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AggregationService } from './aggregation.service';

@Injectable()
export class AggregationTasksService {
  private readonly logger = new Logger(AggregationTasksService.name);
  private aggregationJobInProgress = false;

  constructor(private readonly aggregationService: AggregationService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async runAggregationJob() {
    if (!this.aggregationJobInProgress) {
      this.aggregationJobInProgress = true;

      try {
        this.logger.debug('Starting Aggregations');

        await this.aggregationService.runAggregations();

        this.logger.debug('Finished Aggregations');
      } catch (err) {
        this.logger.error(`Error during Aggregations job: ${err}`);
      }

      this.aggregationJobInProgress = false;
    } else {
      this.logger.debug(
        'Aggregations job still in progress - skipping next execution',
      );
    }
  }
}
