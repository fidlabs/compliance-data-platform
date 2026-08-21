import { CID } from 'multiformats/cid';
import { type Address, isAddress, type Chain } from 'viem';
import { filecoin, filecoinCalibration } from 'viem/chains';
import z from 'zod';

const evmAddress = z.custom<Address>((value) => {
  return typeof value === 'string' && isAddress(value);
}, 'Invalid EVM address');

const cid = z.custom<string>((value) => {
  if (typeof value !== 'string') {
    return false;
  }

  try {
    CID.parse(value);
    return true;
  } catch {
    return false;
  }
}, 'Not a valid CID');

export const RECENT_NODE_CLIENT = 'PO_REP_RECENT_NODE_CLIENT';
export const ARCHIVE_NODE_CLIENT = 'PO_REP_ARCHIVE_NODE_CLIENT';
export const PO_REP_MARKET_CONTRACT_ADDRESS_KEY =
  'PO_REP_MARKET_CONTRACT_ADDRESS';

export const PO_REP_SUPPORTED_CHAINS = [
  filecoin,
  filecoinCalibration,
] as const satisfies Chain[];

export const PO_REP_CONFIG_SCHEMA = z.object({
  PO_REP_CHAIN_ID: z.coerce.number(),
  PO_REP_ARCHIVE_RPC_URL: z.url(),
  PO_REP_ARCHIVE_RPC_AUTH_TOKEN: z.string().nullish(),
  PO_REP_RECENT_RPC_URL: z.url().nullish(),
  PO_REP_RECENT_RPC_AUTH_TOKEN: z.string().nullish(),
  PO_REP_MARKET_CONTRACT_ADDRESS: evmAddress,
  SP_REGISTRY_CONTRACT_ADDRESS: evmAddress,
  FILECOIN_PAY_CONTRACT_ADDRESS: evmAddress,
});

export const DEAL_MANIFEST_PIECE_SCHEMA = z.object({
  pieceCid: cid,
});

export const DEAL_MANIFEST_PIECES_LIST_SCHEMA = z.array(
  DEAL_MANIFEST_PIECE_SCHEMA,
);

export const DEAL_MANIFEST_NESTED_SCHEMA = z
  .array(
    z.object({
      pieces: DEAL_MANIFEST_PIECES_LIST_SCHEMA,
    }),
  )
  .length(1);

export const DEAL_MANIFEST_SCHEMA = z.union([
  DEAL_MANIFEST_PIECES_LIST_SCHEMA,
  DEAL_MANIFEST_NESTED_SCHEMA,
]);
