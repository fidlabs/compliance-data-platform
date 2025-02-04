import { FilSparkService } from 'src/service/filspark/filspark.service';
import { PrismaService } from 'src/db/prisma.service';
import { PrismaDmobService } from 'src/db/prismaDmob.service';
import { AggregationTable } from './aggregation-table';
import { PostgresService } from 'src/db/postgres.service';
import { PostgresDmobService } from 'src/db/postgresDmob.service';

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
