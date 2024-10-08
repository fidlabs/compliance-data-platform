import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaDmobService } from '../db/prismaDmob.service';
import { AggregationRunner } from './aggregation-runner';
import { PrismaService } from '../db/prisma.service';
import { AggregationTable } from './aggregation-table';
import { FilSparkService } from 'src/filspark/filspark.service';

@Injectable()
export class AggregationService {
  private readonly logger = new Logger(AggregationService.name);

  constructor(
    private readonly prismaDmobService: PrismaDmobService,
    private readonly prismaService: PrismaService,
    private readonly filSparkService: FilSparkService,
    @Inject('AggregationRunner')
    private readonly aggregationRunners: AggregationRunner[],
  ) {}

  async executeWithRetries(maxTries: number, fn: () => Promise<void>) {
    let success = false;
    let executionNumber = 0;
    let lastErr;
    while (!success && executionNumber < maxTries) {
      try {
        await fn();
        success = true;
      } catch (err) {
        lastErr = err;
        this.logger.warn(
          `Error during Aggregations job, execution ${executionNumber}/${maxTries-1}: ${err}`,
        );
        if (executionNumber != maxTries) {
          this.logger.warn(`Sleeping for 30s before retrying`);
          await new Promise((resolve) => setTimeout(resolve, 30000));
        }
        executionNumber++;
      }
    }
    if (!success) {
      throw lastErr;
    }
  }

  async runAggregations() {
    const filledTables: AggregationTable[] = [];
    const pendingAggregationRunners = Object.assign(
      [],
      this.aggregationRunners,
    );

    while (pendingAggregationRunners.length > 0) {
      let executedRunners = 0;
      for (const aggregationRunner of this.aggregationRunners) {
        if (
          pendingAggregationRunners.indexOf(aggregationRunner) > -1 &&
          aggregationRunner
            .getDependingTables()
            .every((p) => filledTables.includes(p))
        ) {
          // execute runner
          this.logger.debug(`STARTING: ${aggregationRunner.getName()}`);

          await this.executeWithRetries(3, () =>
            aggregationRunner.run(
              this.prismaService,
              this.prismaDmobService,
              this.filSparkService,
            ),
          );
          this.logger.debug(`FINISHED: ${aggregationRunner.getName()}`);
          executedRunners++;

          // store filled tables
          filledTables.push(...aggregationRunner.getFilledTables());

          // remove from pending runners
          pendingAggregationRunners.splice(
            pendingAggregationRunners.indexOf(aggregationRunner),
            1,
          );
        }
      }
      if (executedRunners === 0) {
        this.logger.error(
          'Cannot execute runners - impossible dependencies defined',
        );
        break;
      }
    }
  }
}
