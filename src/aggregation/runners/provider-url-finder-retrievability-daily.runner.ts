import { Logger } from '@nestjs/common';
import * as _ from 'lodash';
import { DateTime } from 'luxon';
import { isTodayUTC } from 'src/utils/utils';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';

export class ProviderUrlFinderRetrievabilityDailyRunner implements AggregationRunner {
  private readonly logger = new Logger(
    ProviderUrlFinderRetrievabilityDailyRunner.name,
  );

  public async run({
    prismaService,
    prometheusMetricService,
    storageProviderService,
    storageProviderUrlFinderService,
  }: AggregationRunnerRunServices): Promise<void> {
    const {
      startGetDataTimerByRunnerNameMetric,
      startStoreDataTimerByRunnerNameMetric,
    } = prometheusMetricService.aggregateMetrics;

    const latestStored =
      await prismaService.provider_url_finder_retrievability_daily.findFirst({
        select: {
          date: true,
        },
        orderBy: {
          date: 'desc',
        },
      });

    const latestStoredDate = latestStored
      ? DateTime.fromJSDate(latestStored.date, { zone: 'UTC' })
      : null;

    // skip if we already did aggregation today
    if (!!latestStoredDate && isTodayUTC(latestStoredDate)) {
      return;
    }

    const getDataEndTimerMetric = startGetDataTimerByRunnerNameMetric(
      ProviderUrlFinderRetrievabilityDailyRunner.name,
    );

    const storageProviders = await storageProviderService.getProviders();
    const data = [];
    const chunkSize = 100;
    const storageProvidersChunks = _.chunk(storageProviders, chunkSize);
    let processedCount = 0;

    for (let i = 0; i < storageProvidersChunks.length; i++) {
      const spChunk = storageProvidersChunks[i];

      const sliDataForChunk =
        await storageProviderUrlFinderService.fetchLastStorageProviderDataInBulk(
          spChunk.map((x) => x.id),
        );

      const chunkMetricsToInsert = sliDataForChunk.map((provider) => {
        const { provider_id, retrievability_percent } = provider;

        return {
          provider: provider_id,
          success_rate: retrievability_percent,
        };
      });

      processedCount += spChunk.length;

      if (
        processedCount % 100 === 0 ||
        processedCount === storageProviders.length
      ) {
        this.logger.debug(
          `Processed ${processedCount} of ${storageProviders.length} storage providers`,
        );
      }
      data.push(...chunkMetricsToInsert);
    }

    getDataEndTimerMetric();

    const storeDataEndTimerMetric = startStoreDataTimerByRunnerNameMetric(
      ProviderUrlFinderRetrievabilityDailyRunner.name,
    );

    await prismaService.provider_url_finder_retrievability_daily.createMany({
      data: data,
    });

    storeDataEndTimerMetric();
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.ProviderUrlFinderRetrievabilityDaily];
  }

  getDependingTables(): AggregationTable[] {
    return [AggregationTable.Provider];
  }
}
