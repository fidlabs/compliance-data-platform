import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrometheusMetricService } from 'src/prometheus/prometheus';
import { FilSparkService } from 'src/service/filspark/filspark.service';
import { PostgresService } from 'src/db/postgres.service';
import { PostgresDmobService } from 'src/db/postgresDmob.service';
import { PrismaService } from 'src/db/prisma.service';
import { PrismaDmobService } from 'src/db/prismaDmob.service';
import { AggregationRunner } from './aggregation-runner';
import { AggregationTable } from './aggregation-table';

@Injectable()
export class AggregationService {
  private readonly logger = new Logger(AggregationService.name);

  constructor(
    private readonly prismaDmobService: PrismaDmobService,
    private readonly prismaService: PrismaService,
    private readonly filSparkService: FilSparkService,
    private readonly postgresService: PostgresService,
    private readonly postgresDmobService: PostgresDmobService,
    @Inject('AggregationRunner')
    private readonly aggregationRunners: AggregationRunner[],
    private readonly prometheusMetricService: PrometheusMetricService,
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
        executionNumber++;

        this.logger.warn(
          `Error during Aggregations job, execution ${executionNumber}/${maxTries}: ${err}`,
        );

        if (executionNumber != maxTries) {
          this.logger.warn(`Sleeping for 90s before retrying`);
          await new Promise((resolve) => setTimeout(resolve, 90000));
        }
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
          const aggregationRunnerName = aggregationRunner.getName();

          this.logger.debug(`Starting aggregation: ${aggregationRunnerName}`);

          // start transaction timer
          const endSingleAggregationTransactionTimer =
            this.prometheusMetricService.startSingleAggregationTransactionTimer(
              aggregationRunnerName,
            );

          try {
            await this.executeWithRetries(3, () =>
              aggregationRunner.run(
                this.prismaService,
                this.prismaDmobService,
                this.filSparkService,
                this.postgresService,
                this.postgresDmobService,
              ),
            );
          } catch (err) {
            throw err;
          } finally {
            // stop transaction timer
            endSingleAggregationTransactionTimer();
          }

          this.logger.debug(`Finished aggregation: ${aggregationRunnerName}`);

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
