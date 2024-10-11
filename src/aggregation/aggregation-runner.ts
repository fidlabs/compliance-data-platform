import { FilSparkService } from 'src/filspark/filspark.service';
import { PrismaService } from '../db/prisma.service';
import { PrismaDmobService } from '../db/prismaDmob.service';
import { AggregationTable } from './aggregation-table';
import { PostgresService } from '../db/postgres.service';

export interface AggregationRunner {
  run(
    prismaService: PrismaService,
    prismaDmobService: PrismaDmobService,
    filSparkService: FilSparkService,
    postgresService: PostgresService,
  ): Promise<void>;

  getFilledTables(): AggregationTable[];

  getDependingTables(): AggregationTable[];

  getName(): string;
}
