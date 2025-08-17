import { Logger } from '@nestjs/common';
import { getProvidersWithOldIpInfo } from 'prisma/generated/client/sql';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';

export class ProviderIpInfoRunner implements AggregationRunner {
  private readonly logger = new Logger(ProviderIpInfoRunner.name);

  public async run({
    prismaService,
    locationService,
    lotusApiService,
    prometheusMetricService,
  }: AggregationRunnerRunServices): Promise<void> {
    const runnerName = this.getName();
    const {
      startGetDataTimerByRunnerNameMetric,
      startStoreDataTimerByRunnerNameMetric,
    } = prometheusMetricService.aggregateMetrics;

    const getDataEndTimerMetric =
      startGetDataTimerByRunnerNameMetric(runnerName);

    const result = await prismaService.$queryRawTyped(
      getProvidersWithOldIpInfo(),
    );

    const staleProviders = result.map((r) => r.provider).slice(0, 20); // max 20 at a time, lets be gentle to ipinfo & lotus node

    const fullData = await Promise.all(
      staleProviders.map(async (provider) => {
        const minerInfo = await lotusApiService.getMinerInfo(provider);

        const location = await locationService.getLocation(
          minerInfo.result.Multiaddrs,
        );

        return {
          provider,
          lat: location?.loc?.split(',')?.[0],
          long: location?.loc?.split(',')?.[1],
          country: location?.country,
          region: location?.region,
          city: location?.city,
        };
      }),
    );

    const data = fullData.filter(Boolean);

    getDataEndTimerMetric();

    const storeDataEndTimerMetric =
      startStoreDataTimerByRunnerNameMetric(runnerName);

    await prismaService.provider_ip_info.createMany({ data });

    storeDataEndTimerMetric();
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.ProviderIpInfo];
  }

  getDependingTables(): AggregationTable[] {
    return [AggregationTable.ProvidersWeekly];
  }

  getName(): string {
    return 'Provider Ip Info Runner';
  }
}
