import { getClientReplicaDistribution } from '../../../prismaDmob/generated/client/sql';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';

export class ClientReplicaDistributionRunner implements AggregationRunner {
  public async run({
    prismaService,
    prismaDmobService,
    prometheusMetricService,
  }: AggregationRunnerRunServices): Promise<void> {
    const runnerName = this.getName();
    const {
      startGetDataTimerByRunnerNameMetric,
      startStoreDataTimerByRunnerNameMetric,
    } = prometheusMetricService.aggregateMetrics;

    const getDataEndTimerMetric =
      startGetDataTimerByRunnerNameMetric(runnerName);

    const result = await prismaDmobService.$queryRawTyped(
      getClientReplicaDistribution(),
    );

    getDataEndTimerMetric();

    const data = result.map((dmobResult) => ({
      client: dmobResult.client,
      num_of_replicas: dmobResult.num_of_replicas,
      total_deal_size: dmobResult.total_deal_size,
      unique_data_size: dmobResult.unique_data_size,
    }));

    const storeDataEndTimerMetric =
      startStoreDataTimerByRunnerNameMetric(runnerName);

    await prismaService.$executeRaw`truncate client_replica_distribution;`;
    await prismaService.client_replica_distribution.createMany({ data });

    storeDataEndTimerMetric();
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.ClientReplicaDistribution];
  }

  getDependingTables(): AggregationTable[] {
    return [];
  }

  getName(): string {
    return 'Client Replica Distribution Runner';
  }
}
