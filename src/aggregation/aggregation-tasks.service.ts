import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { PrometheusMetricService } from 'src/prometheus';
import { PrismaDmobService } from '../db/prismaDmob.service';
import { PrismaService } from '../db/prisma.service';
import { FilSparkService } from '../service/filspark/filspark.service';
import { PostgresService } from '../db/postgres.service';
import { PostgresDmobService } from '../db/postgresDmob.service';
import { AggregationRunner } from './aggregation-runner';
import { IpniMisreportingCheckerService } from '../service/ipni-misreporting-checker/ipni-misreporting-checker.service';
import { LocationService } from '../service/location/location.service';
import { LotusApiService } from '../service/lotus-api/lotus-api.service';
import { GitHubAllocatorRegistryService } from '../service/github-allocator-registry/github-allocator-registry.service';
import { GitHubAllocatorClientBookkeepingService } from '../service/github-allocator-client-bookkeeping/github-allocator-client-bookkeeping.service';
import { AggregationTable } from './aggregation-table';
import { StorageProviderService } from '../service/storage-provider/storage-provider.service';
import { StorageProviderUrlFinderService } from '../service/storage-provider-url-finder/storage-provider-url-finder.service';
import { sleep } from 'src/utils/utils';
import { AllocatorService } from 'src/service/allocator/allocator.service';

@Injectable()
export class AggregationTasksService extends HealthIndicator {
  private readonly logger = new Logger(AggregationTasksService.name);
  private jobInProgress = false;
  private healthy = true;
  private unhealthyReason: string = null;
  private lastSuccess: Date = null;
  private lastRun: Date = null;

  constructor(
    private readonly prismaDmobService: PrismaDmobService,
    private readonly prismaService: PrismaService,
    private readonly filSparkService: FilSparkService,
    private readonly postgresService: PostgresService,
    private readonly postgresDmobService: PostgresDmobService,
    @Inject('AggregationRunner')
    private readonly aggregationRunners: AggregationRunner[],
    private readonly prometheusMetricService: PrometheusMetricService,
    private readonly ipniMisreportingCheckerService: IpniMisreportingCheckerService,
    private readonly locationService: LocationService,
    private readonly lotusApiService: LotusApiService,
    private readonly allocatorRegistryService: GitHubAllocatorRegistryService,
    private readonly allocatorClientBookkeepingService: GitHubAllocatorClientBookkeepingService,
    private readonly storageProviderService: StorageProviderService,
    private readonly storageProviderUrlFinderService: StorageProviderUrlFinderService,
    private readonly allocatorService: AllocatorService,
  ) {
    super();
  }

  public async getHealth(): Promise<HealthIndicatorResult> {
    const result = this.getStatus(AggregationTasksService.name, this.healthy, {
      lastSuccess: this.lastSuccess,
      lastRun: this.lastRun,
      unhealthyReason: this.healthy ? null : this.unhealthyReason,
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

        await this.runAggregations();

        this.lastSuccess = new Date();
        this.logger.log('Finished aggregations');
      } catch (err) {
        this.healthy = false;
        this.unhealthyReason = err.message || 'Unknown error';

        this.logger.error(
          `Error during aggregation job: ${err.message}`,
          // err.cause?.stack || err.stack,
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

  public async runAggregations() {
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
          const aggregationRunnerName = aggregationRunner.constructor.name;
          this.logger.debug(`Starting aggregation: ${aggregationRunnerName}`);

          // start transaction timer
          const endSingleAggregationTransactionTimer =
            this.prometheusMetricService.aggregateMetrics.startTimerByRunnerNameMetric(
              aggregationRunnerName,
            );

          try {
            await this.executeWithRetries(
              3,
              () =>
                // prettier-ignore
                aggregationRunner.run({
                  prismaService: this.prismaService,
                  prismaDmobService: this.prismaDmobService,
                  filSparkService: this.filSparkService,
                  postgresService: this.postgresService,
                  postgresDmobService: this.postgresDmobService,
                  prometheusMetricService: this.prometheusMetricService,
                  ipniMisreportingCheckerService: this.ipniMisreportingCheckerService,
                  locationService: this.locationService,
                  lotusApiService: this.lotusApiService,
                  allocatorRegistryService: this.allocatorRegistryService,
                  allocatorClientBookkeepingService: this.allocatorClientBookkeepingService,
                  storageProviderService: this.storageProviderService,
                  storageProviderUrlFinderService: this.storageProviderUrlFinderService,
                  allocatorService: this.allocatorService,
                }),
              aggregationRunnerName,
            );
          } catch (err) {
            throw new Error(
              `Error running ${aggregationRunnerName}: ${err.message || err.code || err}`,
              { cause: err },
            );
          } finally {
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

  private async executeWithRetries(
    maxTries: number,
    fn: () => Promise<void>,
    aggregationRunnerName: string,
  ) {
    let success = false;
    let executionNumber = 0;
    let lastErr: Error = null;

    while (!success && executionNumber < maxTries) {
      try {
        await fn();
        success = true;
      } catch (err) {
        lastErr = err;
        executionNumber++;

        this.logger.warn(
          `Error during aggregation job: ${aggregationRunnerName}, execution ${executionNumber}/${maxTries}: ${err.message || err.code || err}`,
        );

        if (executionNumber !== maxTries) await sleep(90000); // 90 seconds
      }
    }

    if (!success) throw lastErr;
  }
}
