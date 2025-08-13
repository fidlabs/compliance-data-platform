import { Controller, Get } from '@nestjs/common';
import { OldDatacapService } from 'src/service/old-datacap/old-datacap.service';
import { ApiOkResponse } from '@nestjs/swagger';
import { CacheTTL } from '@nestjs/cache-manager';
import {
  OldDatacapAllocatorBalanceWeekResponse,
  OldDatacapClientBalanceWeekResponse,
} from './types.old-datacap';

@Controller('stats/old-datacap')
@CacheTTL(1000 * 60 * 30) // 30 minutes
export class OldDatacapController {
  constructor(private readonly oldDatacapService: OldDatacapService) {}

  @Get('allocator-balance')
  @ApiOkResponse({ type: OldDatacapAllocatorBalanceWeekResponse })
  public async getAllocatorBalance(): Promise<OldDatacapAllocatorBalanceWeekResponse> {
    return { results: await this.oldDatacapService.getAllocatorBalance() };
  }

  @Get('client-balance')
  @ApiOkResponse({ type: OldDatacapClientBalanceWeekResponse })
  public async getClientBalance(): Promise<OldDatacapClientBalanceWeekResponse> {
    return { results: await this.oldDatacapService.getClientBalance() };
  }
}
