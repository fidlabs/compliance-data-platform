import { PrismaService } from 'src/db/prisma.service';
import { PrismaDmobService } from 'src/db/prismaDmob.service';
import { FilSparkService } from 'src/service/filspark/filspark.service';
import { AggregationRunner } from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';
import { getClientReplicaDistribution } from '../../../prismaDmob/generated/client/sql';

export class ClientReplicaDistributionRunner implements AggregationRunner {
  async run(
    prismaService: PrismaService,
    prismaDmobService: PrismaDmobService,
    _filSparkService: FilSparkService,
  ): Promise<void> {
    const result = await prismaDmobService.$queryRawTyped(
      getClientReplicaDistribution(),
    );

    const data = result.map((dmobResult) => ({
      client: dmobResult.client,
      num_of_replicas: dmobResult.num_of_replicas,
      total_deal_size: dmobResult.total_deal_size,
      unique_data_size: dmobResult.unique_data_size,
    }));

    await prismaService.$executeRaw`truncate client_replica_distribution;`;
    await prismaService.client_replica_distribution.createMany({ data });
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
