import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DiscoveryModule, DiscoveryService } from '@nestjs/core';
import { PrismaService } from '../db/prisma.service';
import {
  ARCHIVE_NODE_CLIENT,
  RECENT_NODE_CLIENT,
} from './po-rep-indexer.constants';
import { PoReConfigService } from './po-rep-indexer.types';
import {
  createClientForChainOrThrow,
  validatePoRepConfig,
} from './po-rep-indexer.utils';
import { AbstractPoRepIndexerRunner } from './runners/abstract-po-rep-indexer.runner';
import { PoRepDealsIndexerRunner } from './runners/po-rep-deals-indexer.runner';
import { PoRepProvidersIndexerRunner } from './runners/po-rep-providers-indexer.runner';

@Module({
  imports: [
    ConfigModule.forRoot({
      validate: validatePoRepConfig,
    }),
    DiscoveryModule,
  ],
  providers: [
    PrismaService,
    PoRepProvidersIndexerRunner,
    PoRepDealsIndexerRunner,
    {
      provide: RECENT_NODE_CLIENT,
      useFactory: (configService: PoReConfigService) => {
        return createClientForChainOrThrow({
          chainId: configService.get('PO_REP_CHAIN_ID'),
          rpcUrl: configService.get('PO_REP_RECENT_RPC_URL'),
          authToken: configService.get('PO_REP_RECENT_RPC_AUTH_TOKEN'),
        });
      },
      inject: [ConfigService],
    },
    {
      provide: ARCHIVE_NODE_CLIENT,
      useFactory: (configService: PoReConfigService) => {
        return createClientForChainOrThrow({
          chainId: configService.get('PO_REP_CHAIN_ID'),
          rpcUrl: configService.get('PO_REP_ARCHIVE_RPC_URL'),
          authToken: configService.get('PO_REP_ARCHIVE_RPC_AUTH_TOKEN'),
        });
      },
      inject: [ConfigService],
    },
  ],
})
export class PoRepIndexerModule implements OnModuleInit {
  constructor(private readonly discoveryService: DiscoveryService) {}

  onModuleInit() {
    const providers = this.discoveryService.getProviders();
    const indexerRunnersDuplicateNames = providers
      .map((provider) => {
        return provider.instance;
      })
      .filter(
        (providerInstance): providerInstance is AbstractPoRepIndexerRunner => {
          return providerInstance instanceof AbstractPoRepIndexerRunner;
        },
      )
      .map((providerInstance) => providerInstance.getName())
      .filter((name, index, names) => {
        return names.indexOf(name) !== index;
      });

    if (indexerRunnersDuplicateNames.length > 0) {
      throw new TypeError(
        `Multiple PoRep indexer runners with same names found: ${indexerRunnersDuplicateNames.join(', ')}`,
      );
    }
  }
}
