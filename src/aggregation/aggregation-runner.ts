import { PostgresService } from 'src/db/postgres.service';
import { PostgresDmobService } from 'src/db/postgresDmob.service';
import { PrismaService } from 'src/db/prisma.service';
import { PrismaDmobService } from 'src/db/prismaDmob.service';
import { PrometheusMetricService } from 'src/prometheus';
import { FilSparkService } from 'src/service/filspark/filspark.service';
import { LocationService } from 'src/service/location/location.service';
import { LotusApiService } from 'src/service/lotus-api/lotus-api.service';
import { AggregationTable } from './aggregation-table';

export type AggregationRunnerRunServices = {
  prismaService: PrismaService;
  prismaDmobService?: PrismaDmobService;
  filSparkService?: FilSparkService;
  postgresService?: PostgresService;
  postgresDmobService?: PostgresDmobService;
  prometheusMetricService?: PrometheusMetricService;
  locationService?: LocationService;
  lotusApiService?: LotusApiService;
};

export interface AggregationRunner {
  run(services: AggregationRunnerRunServices): Promise<void>;

  getFilledTables(): AggregationTable[];

  getDependingTables(): AggregationTable[];

  getName(): string;
}
