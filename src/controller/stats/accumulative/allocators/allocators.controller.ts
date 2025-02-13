import { Controller, Get } from '@nestjs/common';
import { AllocatorService } from 'src/service/allocator/allocator.service';
import { ApiOkResponse } from '@nestjs/swagger';
import { AllocatorComplianceWeekResponse } from 'src/service/allocator/types.allocator';
import {
  HistogramWeekResponse,
  RetrievabilityWeekResponse,
} from 'src/service/histogram-helper/types.histogram-helper';
import { CacheTTL } from '@nestjs/cache-manager';

@Controller('stats/acc/allocators')
@CacheTTL(1000 * 60 * 30) // 30 minutes
export class AllocatorsAccController {
  constructor(private readonly allocatorService: AllocatorService) {}

  @Get('retrievability')
  @ApiOkResponse({ type: RetrievabilityWeekResponse })
  public async getAllocatorRetrievability(): Promise<RetrievabilityWeekResponse> {
    return await this.allocatorService.getAllocatorRetrievabilityWeekly(true);
  }

  @Get('biggest-client-distribution')
  @ApiOkResponse({ type: HistogramWeekResponse })
  public async getAllocatorBiggestClientDistribution(): Promise<HistogramWeekResponse> {
    return await this.allocatorService.getAllocatorBiggestClientDistributionWeekly(
      true,
    );
  }

  @Get('sps-compliance-data')
  @ApiOkResponse({ type: AllocatorComplianceWeekResponse })
  public async getAllocatorCompliance(): Promise<AllocatorComplianceWeekResponse> {
    return await this.allocatorService.getAllocatorComplianceWeekly(true);
  }
}
