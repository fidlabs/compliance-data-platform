import { FilSparkService } from 'src/service/filspark/filspark.service';
import { PrismaService } from '../db/prisma.service';
import { PrismaDmobService } from '../db/prismaDmob.service';
import { AggregationTable } from './aggregation-table';
import { PostgresService } from '../db/postgres.service';
import { PostgresDmobService } from '../db/postgresDmob.service';

export interface AggregationRunner {
  run(
    prismaService: PrismaService,
    prismaDmobService: PrismaDmobService,
    filSparkService: FilSparkService,
    postgresService: PostgresService,
    postgresDmobService: PostgresDmobService,
  ): Promise<void>;

  getFilledTables(): AggregationTable[];

  getDependingTables(): AggregationTable[];

  getName(): string;
}
