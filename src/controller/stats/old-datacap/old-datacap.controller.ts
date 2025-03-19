import { Controller, Get } from '@nestjs/common';
import { OldDatacapService } from 'src/service/old-datacap/old-datacap.service';
import { ApiOkResponse } from '@nestjs/swagger';
import { OldDatacapAllocatorBalanceWeekResponse } from 'src/service/old-datacap/types.old-datacap';
import { CacheTTL } from '@nestjs/cache-manager';

@Controller('stats/old-datacap')
@CacheTTL(1000 * 60 * 30) // 30 minutes
export class OldDatacapController {
  constructor(private readonly oldDatacapService: OldDatacapService) {}

  @Get('allocator-balance')
  @ApiOkResponse({ type: OldDatacapAllocatorBalanceWeekResponse })
  public async getAllocatorBalance(): Promise<OldDatacapAllocatorBalanceWeekResponse> {
    return await this.oldDatacapService.getAllocatorBalance();
  }
}
