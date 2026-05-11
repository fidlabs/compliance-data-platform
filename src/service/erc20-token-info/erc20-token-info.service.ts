import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { PoRepPublicClient, RECENT_NODE_CLIENT } from 'src/po-rep-indexer';
import { Cacheable } from 'src/utils/cacheable';
import {
  isAddress,
  isAddressEqual,
  parseAbi,
  zeroAddress,
  type Address,
} from 'viem';

const erc20Abi = parseAbi([
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
]);

@Injectable()
export class ERC20TokenInfoService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Inject(RECENT_NODE_CLIENT)
    private readonly recentNodeClient: PoRepPublicClient,
  ) {}

  @Cacheable() // Cache permanently, symbol does not change
  public async getTokenSymbol(tokenAddress: string): Promise<string> {
    this.assertValidTokenAddress(tokenAddress);

    if (isAddressEqual(tokenAddress, zeroAddress)) {
      return this.recentNodeClient.chain.nativeCurrency.symbol;
    }

    const symbol = await this.recentNodeClient.readContract({
      authorizationList: undefined,
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'symbol',
    });

    return symbol;
  }

  @Cacheable() // Cache permanently, decimals do not change
  public async getTokenDecimals(tokenAddress: string): Promise<number> {
    this.assertValidTokenAddress(tokenAddress);

    if (isAddressEqual(tokenAddress, zeroAddress)) {
      return this.recentNodeClient.chain.nativeCurrency.decimals;
    }

    const decimals = await this.recentNodeClient.readContract({
      authorizationList: undefined,
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'decimals',
    });

    return decimals;
  }

  private assertValidTokenAddress(
    tokenAddress: string,
  ): asserts tokenAddress is Address {
    if (!isAddress(tokenAddress)) {
      throw new TypeError(
        `"${tokenAddress}" is not a valid ERC20 token address`,
      );
    }
  }
}
