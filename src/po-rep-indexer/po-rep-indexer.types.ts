import { HttpTransport, PublicClient } from 'viem';
import z from 'zod';
import {
  DEAL_MANIFEST_PIECE_SCHEMA,
  DEAL_MANIFEST_SCHEMA,
  PO_REP_CONFIG_SCHEMA,
  PO_REP_SUPPORTED_CHAINS,
} from './po-rep-indexer.constants';

type SupportedChain = (typeof PO_REP_SUPPORTED_CHAINS)[number];

export type PoRepPublicClient = PublicClient<
  HttpTransport,
  SupportedChain,
  undefined
>;

export type PoRepConfig = z.infer<typeof PO_REP_CONFIG_SCHEMA>;

export type DealManifest = z.infer<typeof DEAL_MANIFEST_SCHEMA>;
export type DealManifestPiece = z.infer<typeof DEAL_MANIFEST_PIECE_SCHEMA>;

type DealManifestResultBase = {
  dealId: bigint;
  manifestLocation: string;
};

export type DealManifestSuccessResult = DealManifestResultBase & {
  success: true;
  data: {
    manifestContent: DealManifest;
    cached: boolean;
  };
  error?: never;
};

export type DealManifestErrorResult = DealManifestResultBase & {
  success: false;
  data?: never;
  error: any;
};

export type DealManifestResult =
  | DealManifestSuccessResult
  | DealManifestErrorResult;
