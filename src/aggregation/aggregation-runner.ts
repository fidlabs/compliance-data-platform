import { PostgresService } from 'src/db/postgres.service';
import { PostgresDmobService } from 'src/db/postgresDmob.service';
import { PrismaService } from 'src/db/prisma.service';
import { PrismaDmobService } from 'src/db/prismaDmob.service';
import { PrometheusMetricService } from 'src/prometheus';
import { GitHubAllocatorClientBookkeepingService } from 'src/service/github-allocator-client-bookkeeping/github-allocator-client-bookkeeping.service';
import { GitHubAllocatorRegistryService } from 'src/service/github-allocator-registry/github-allocator-registry.service';
import { IpniMisreportingCheckerService } from 'src/service/ipni-misreporting-checker/ipni-misreporting-checker.service';
import { LocationService } from 'src/service/location/location.service';
import { LotusApiService } from 'src/service/lotus-api/lotus-api.service';
import { AllocatorService } from '../service/allocator/allocator.service';
import { StorageProviderUrlFinderService } from '../service/storage-provider-url-finder/storage-provider-url-finder.service';
import { StorageProviderService } from '../service/storage-provider/storage-provider.service';
import { AggregationTable } from './aggregation-table';

export type AggregationRunnerRunServices = {
  prismaService: PrismaService;
  prismaDmobService?: PrismaDmobService;
  postgresService?: PostgresService;
  postgresDmobService?: PostgresDmobService;
  prometheusMetricService?: PrometheusMetricService;
  ipniMisreportingCheckerService?: IpniMisreportingCheckerService;
  locationService?: LocationService;
  lotusApiService?: LotusApiService;
  allocatorRegistryService?: GitHubAllocatorRegistryService;
  allocatorClientBookkeepingService?: GitHubAllocatorClientBookkeepingService;
  storageProviderService: StorageProviderService;
  storageProviderUrlFinderService: StorageProviderUrlFinderService;
  allocatorService: AllocatorService;
};

export interface AggregationRunner {
  run(services: AggregationRunnerRunServices): Promise<void>;

  getFilledTables(): AggregationTable[];

  getDependingTables(): AggregationTable[];
}
