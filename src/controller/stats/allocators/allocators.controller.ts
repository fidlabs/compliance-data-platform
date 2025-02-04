import { Controller, Get } from '@nestjs/common';
import { AllocatorService } from 'src/service/allocator/allocator.service';
import { ApiOkResponse } from '@nestjs/swagger';
import { AllocatorComplianceWeekResponse } from 'src/service/allocator/types.allocator';
import {
  HistogramWeekResponse,
  RetrievabilityWeekResponse,
} from 'src/service/histogram-helper/types.histogram-helper';
import { CacheTTL } from '@nestjs/cache-manager';

@Controller('stats/allocators')
@CacheTTL(1000 * 60 * 60) // 1 hour
export class AllocatorsController {
  constructor(private readonly allocatorService: AllocatorService) {}

  @Get('retrievability')
  @ApiOkResponse({ type: RetrievabilityWeekResponse })
  async getAllocatorRetrievability(): Promise<RetrievabilityWeekResponse> {
    return await this.allocatorService.getAllocatorRetrievability(false);
  }

  @Get('biggest-client-distribution')
  @ApiOkResponse({ type: HistogramWeekResponse })
  async getAllocatorBiggestClientDistribution(): Promise<HistogramWeekResponse> {
    return await this.allocatorService.getAllocatorBiggestClientDistribution(
      false,
    );
  }

  @Get('sps-compliance')
  @ApiOkResponse({ type: AllocatorComplianceWeekResponse })
  async getAllocatorSpsCompliance(): Promise<AllocatorComplianceWeekResponse> {
    return await this.allocatorService.getAllocatorCompliance(false);
  }
}
