import { Inject, Injectable, Logger } from '@nestjs/common';
import { createPublicClient, http, parseAbi, formatUnits } from 'viem';
import { filecoin } from 'viem/chains';
import {
  ethAddressFromDelegated,
  ethAddressFromID,
} from '@glif/filecoin-address';
import { Cacheable } from 'src/utils/cacheable';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class EthApiService {
  private readonly logger = new Logger(EthApiService.name);
  private readonly client = createPublicClient({
    chain: filecoin,
    transport: http(),
  });

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  @Cacheable({ ttl: 1000 * 60 * 60 }) // 1 hour
  public async getClientContractMaxDeviation(
    fAddress: string, // f4 address
    clientId: string, // f0 address
  ): Promise<string | null> {
    const address = ethAddressFromDelegated(fAddress);
    const clientAddress = ethAddressFromID(clientId);

    const abi = parseAbi([
      'function clientConfigs(address client) view returns (uint256 maxDeviation)',
    ]);

    const maxDeviation = await this.client.readContract({
      address: address,
      abi: abi,
      functionName: 'clientConfigs',
      args: [clientAddress],
      authorizationList: undefined,
    });

    return formatUnits(maxDeviation, 2);
  }

  @Cacheable({ ttl: 1000 * 60 * 60 }) // 1 hour
  public async checkAndMapCurioStorageProviderPeerId(
    spAddress: string,
  ): Promise<string | null> {
    const validatedSpAddress = spAddress.startsWith('f')
      ? spAddress.substring(1)
      : spAddress;

    const abi = [
      {
        name: 'getPeerData',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ internalType: 'uint64', name: 'minerID', type: 'uint64' }],
        outputs: [
          {
            components: [
              { internalType: 'string', name: 'peerID', type: 'string' },
              { internalType: 'bytes', name: 'signature', type: 'bytes' },
            ],
            internalType: 'struct PeerData',
            name: '',
            type: 'tuple',
          },
        ],
      },
    ];

    const peerData: {
      peerID: string;
      signature: string;
    } = (await this.client.readContract({
      address: '0x14183aD016Ddc83D638425D6328009aa390339Ce', // Curio's contract address
      abi: abi,
      functionName: 'getPeerData',
      args: [BigInt(validatedSpAddress)],
      authorizationList: undefined,
    })) as { peerID: string; signature: string };

    return peerData.peerID || null;
  }
}
