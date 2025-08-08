import { Controller, Get, Query } from '@nestjs/common';
import { OldDatacapService } from 'src/service/old-datacap/old-datacap.service';
import { ApiOkResponse } from '@nestjs/swagger';
import {
  OldDatacapAllocatorBalanceWeekResponse,
  OldDatacapClientBalanceWeekResponse,
} from 'src/service/old-datacap/types.old-datacap';
import { CacheTTL } from '@nestjs/cache-manager';
import { FilPlusEditionRequest } from 'src/controller/base/program-round-controller-base';

@Controller('stats/old-datacap')
@CacheTTL(1000 * 60 * 30) // 30 minutes
export class OldDatacapController {
  constructor(private readonly oldDatacapService: OldDatacapService) {}

  // owned by entities tab
  @Get('allocator-balance')
  @ApiOkResponse({ type: OldDatacapAllocatorBalanceWeekResponse })
  public async getAllocatorBalance(
    @Query() query: FilPlusEditionRequest,
  ): Promise<OldDatacapAllocatorBalanceWeekResponse> {
    return await this.oldDatacapService.getAllocatorBalance(
      Number(query.roundId),
    );
  }

  @Get('client-balance')
  @ApiOkResponse({ type: OldDatacapClientBalanceWeekResponse })
  public async getClientBalance(
    @Query() query: FilPlusEditionRequest,
  ): Promise<OldDatacapClientBalanceWeekResponse> {
    return await this.oldDatacapService.getClientBalance(Number(query.roundId));
  }
}
