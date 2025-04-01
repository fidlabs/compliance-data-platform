import { getProvidersWithOldIpInfo } from 'prisma/generated/client/sql';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';

export class ProviderIpInfoRunner implements AggregationRunner {
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
        const empty = {
          provider,
          lat: null,
          long: null,
          country: null,
          region: null,
          city: null,
        };
        if (!minerInfo.result.Multiaddrs) {
          return empty;
        }
        let result;
        try {
          result = await locationService.getLocation(
            minerInfo.result.Multiaddrs,
          );
        } catch (e) {
          console.warn(e);
          return empty;
        }
        if (!result) {
          return empty;
        }
        const { loc, country, region, city } = result;
        const [lat, long] = loc.split(',');
        return {
          provider,
          lat,
          long,
          country,
          region,
          city,
        };
      }),
    );
    const data = fullData.filter((v) => v);

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
