import { CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { OldDatacapService } from 'src/service/old-datacap/old-datacap.service';
import {
  OldDatacapAllocatorBalanceWeekResponse,
  OldDatacapClientBalanceWeekResponse,
} from 'src/service/old-datacap/types.old-datacap';

@Controller('stats/old-datacap')
@CacheTTL(1000 * 60 * 30) // 30 minutes
export class OldDatacapController {
  constructor(private readonly oldDatacapService: OldDatacapService) {}

  @Get('allocator-balance')
  @ApiOkResponse({ type: OldDatacapAllocatorBalanceWeekResponse })
  public async getAllocatorBalance(): Promise<OldDatacapAllocatorBalanceWeekResponse> {
    return await this.oldDatacapService.getAllocatorBalance();
  }

  @Get('client-balance')
  @ApiOkResponse({ type: OldDatacapClientBalanceWeekResponse })
  public async getClientBalance(): Promise<OldDatacapClientBalanceWeekResponse> {
    return await this.oldDatacapService.getClientBalance();
  }
}
