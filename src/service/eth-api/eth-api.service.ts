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
}
