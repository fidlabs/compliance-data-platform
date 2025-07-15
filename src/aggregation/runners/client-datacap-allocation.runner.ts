import { getClientDatacapAllocation } from 'prismaDmob/generated/client/sql';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';

export class ClientDatacapAllocationRunner implements AggregationRunner {
  public async run({
    prismaService,
    prismaDmobService,
    prometheusMetricService,
  }: AggregationRunnerRunServices): Promise<void> {
    const {
      startGetDataTimerByRunnerNameMetric,
      startStoreDataTimerByRunnerNameMetric,
    } = prometheusMetricService.aggregateMetrics;

    const getDataEndTimerMetric = startGetDataTimerByRunnerNameMetric(
      ClientDatacapAllocationRunner.name,
    );

    const result = await prismaDmobService.$queryRawTyped(
      getClientDatacapAllocation(),
    );

    getDataEndTimerMetric();

    const storeDataEndTimerMetric = startStoreDataTimerByRunnerNameMetric(
      ClientDatacapAllocationRunner.name,
    );

    await prismaService.$executeRaw`delete from client_datacap_allocation;`;
    await prismaService.client_datacap_allocation.createMany({ data: result });

    storeDataEndTimerMetric();
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.ClientDatacapAllocation];
  }

  getDependingTables(): AggregationTable[] {
    return [];
  }
}
