import { Injectable } from '@nestjs/common';

@Injectable()
export class PoRepPriceOracleService {
  public async getTokenExchangeRateUSD(_tokenAddress: string): Promise<number> {
    // Currently we assume only stable coins will be used for PoRep deals
    return 1;
  }
}
