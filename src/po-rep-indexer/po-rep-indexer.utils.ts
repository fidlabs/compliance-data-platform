import { createPublicClient, extractChain, http } from 'viem';
import z from 'zod';
import {
  PO_REP_CONFIG_SCHEMA,
  PO_REP_SUPPORTED_CHAINS,
} from './po-rep-indexer.constants';
import { PoRepConfig, PoRepPublicClient } from './po-rep-indexer.types';

type SupportedChainId = (typeof PO_REP_SUPPORTED_CHAINS)[number]['id'];

export interface GetClientForChainOptions {
  chainId: number;
  rpcUrl?: string | null;
  authToken?: string | null;
}

function assertIsSupportedChainId(
  chainId: number,
): asserts chainId is SupportedChainId {
  const isSupported = PO_REP_SUPPORTED_CHAINS.map(
    (chain) => chain.id as number,
  ).includes(chainId);

  if (!isSupported) {
    throw new TypeError(`Unsupported PoRep Market chain id: "${chainId}"`);
  }
}

export function createClientForChainOrThrow({
  chainId,
  rpcUrl,
  authToken,
}: GetClientForChainOptions): PoRepPublicClient {
  assertIsSupportedChainId(chainId);

  const chain = extractChain({ chains: PO_REP_SUPPORTED_CHAINS, id: chainId });

  return createPublicClient({
    chain: chain,
    transport: http(rpcUrl ?? undefined, {
      fetchOptions:
        typeof authToken === 'string' && authToken !== ''
          ? {
              headers: {
                Authorization: `Bearer ${authToken}`,
              },
            }
          : undefined,
    }),
  }) as unknown as PoRepPublicClient;
}

export function validatePoRepConfig(
  config: Record<string, unknown>,
): PoRepConfig {
  const result = PO_REP_CONFIG_SCHEMA.safeParse(config);

  if (!result.success) {
    throw new TypeError(
      `Invalid PoRep config provided:\n\n${z.prettifyError(result.error)}`,
    );
  }

  return result.data;
}
