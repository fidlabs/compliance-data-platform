import {
  FactoryProvider,
  Inject,
  Logger,
  OnApplicationShutdown,
  Provider,
} from '@nestjs/common';
import { Kysely, KyselyConfig, PostgresDialect } from 'kysely';
import { DB } from './auto-generated/types';
import { PostgresService } from './postgres.service';

const KYSELY_CLIENT_TOKEN = 'KyselyClientToken';

class KyselyService implements OnApplicationShutdown {
  private readonly logger = new Logger(KyselyService.name);
  private activeClientsSet: Set<Kysely<DB>> = new Set();

  get activeClients() {
    return Array.from(this.activeClientsSet);
  }

  public addClient(client: Kysely<DB>) {
    this.activeClientsSet.add(client);
  }

  async onApplicationShutdown() {
    for (const client of this.activeClientsSet.values()) {
      try {
        await client.destroy();
        this.activeClientsSet.delete(client);
      } catch (error) {
        this.logger.error(`Failed to destroy Kysely client: ${error}`);
      }
    }
  }
}

const queryBuilderProvider: FactoryProvider<Kysely<DB>> = {
  provide: KYSELY_CLIENT_TOKEN,
  inject: [PostgresService, KyselyService],
  useFactory: function (
    postgresService: PostgresService,
    kyselyService: KyselyService,
  ) {
    const config: KyselyConfig = {
      dialect: new PostgresDialect({
        pool: postgresService.pool,
      }),
    };

    const client = new Kysely<DB>(config);
    kyselyService.addClient(client);
    return client;
  },
};

export const queryBuilderProviders: Provider[] = [
  KyselyService,
  queryBuilderProvider,
];

export function InjectQueryBuilder() {
  return Inject(KYSELY_CLIENT_TOKEN);
}

export type QueryBuilder = Kysely<DB>;
