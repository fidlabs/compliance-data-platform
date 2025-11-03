import { Injectable, Logger } from '@nestjs/common';
import { createPublicClient, http, parseAbi, formatUnits } from 'viem';
import { filecoin } from 'viem/chains';
import {
  ethAddressFromDelegated,
  ethAddressFromID,
} from '@glif/filecoin-address';

@Injectable()
export class EthApiService {
  private readonly logger = new Logger(EthApiService.name);
  private readonly client = createPublicClient({
    chain: filecoin,
    transport: http(),
  });

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
      address,
      abi,
      functionName: 'clientConfigs',
      args: [clientAddress],
    });

    return formatUnits(maxDeviation, 2);
  }

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
      abi,
      functionName: 'getPeerData',
      args: [BigInt(validatedSpAddress)],
    })) as { peerID: string; signature: string };

    return peerData.peerID || null;
  }
}
