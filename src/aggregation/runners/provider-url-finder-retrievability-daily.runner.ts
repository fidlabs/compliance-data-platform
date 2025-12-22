import { DateTime } from 'luxon';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';
import { sleep, yesterday } from 'src/utils/utils';
import { Logger } from '@nestjs/common';

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

    if (latestStoredDate >= yesterday()) {
      // already downloaded yesterday's data, wait for next day
      return;
    }

    const getDataEndTimerMetric = startGetDataTimerByRunnerNameMetric(
      ProviderUrlFinderRetrievabilityDailyRunner.name,
    );

    const storageProviders = await storageProviderService.getProviders();
    const data = [];
    const sliceSize = 20;

    for (let i = 0; i < storageProviders.length; i += sliceSize) {
      const _storageProviders = storageProviders.slice(i, i + sliceSize);

      const newData = await Promise.all(
        _storageProviders.map(async (provider) => {
          return {
            provider: provider.id,
            success_rate: (
              await storageProviderUrlFinderService.fetchLastStorageProviderData(
                provider.id,
              )
            ).retrievability_percent,
          };
        }),
      );

      data.push(...newData);

      // await prismaService.provider_url_finder_retrievability_daily.createMany({
      //   data: newData,
      // }); // save progress?

      // log progress every ~100 providers
      if (i % 100 < sliceSize && i > 0) {
        this.logger.debug(
          `Processed ${i} of ${storageProviders.length} storage providers`,
        );
      }

      await sleep(5000); // 5 seconds
    }

    getDataEndTimerMetric();

    const storeDataEndTimerMetric = startStoreDataTimerByRunnerNameMetric(
      ProviderUrlFinderRetrievabilityDailyRunner.name,
    );

    await prismaService.provider_url_finder_retrievability_daily.createMany({
      data,
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
