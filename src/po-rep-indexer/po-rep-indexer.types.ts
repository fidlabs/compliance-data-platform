import { HttpTransport, PublicClient } from 'viem';
import {
  PO_REP_CONFIG_SCHEMA,
  PO_REP_SUPPORTED_CHAINS,
} from './po-rep-indexer.constants';
import z from 'zod';
import { ConfigService } from '@nestjs/config';

type SupportedChain = (typeof PO_REP_SUPPORTED_CHAINS)[number];

export type PoRepPublicClient = PublicClient<
  HttpTransport,
  SupportedChain,
  undefined
>;

export type PoRepConfig = z.infer<typeof PO_REP_CONFIG_SCHEMA>;

export declare class PoReConfigService extends ConfigService<
  PoRepConfig,
  true
> {}
