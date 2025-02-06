import { PrismaService } from 'src/db/prisma.service';
import { PrismaDmobService } from 'src/db/prismaDmob.service';
import { FilSparkService } from 'src/service/filspark/filspark.service';
import { AggregationRunner } from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';
import { getCidSharing } from '../../../prismaDmob/generated/client/sql';

export class CidSharingRunner implements AggregationRunner {
  public async run(
    prismaService: PrismaService,
    prismaDmobService: PrismaDmobService,
    _filSparkService: FilSparkService,
  ): Promise<void> {
    const result = await prismaDmobService.$queryRawTyped(getCidSharing());

    const data = result.map((dmobResult) => ({
      client: dmobResult.client,
      other_client: dmobResult.other_client,
      total_deal_size: dmobResult.total_deal_size,
      unique_cid_count: dmobResult.unique_cid_count,
    }));

    await prismaService.$executeRaw`truncate cid_sharing;`;
    await prismaService.cid_sharing.createMany({ data });
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.CidSharing];
  }

  getDependingTables(): AggregationTable[] {
    return [];
  }

  getName(): string {
    return 'CID Sharing Runner';
  }
}
