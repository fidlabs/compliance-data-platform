import { Controller, Get } from '@nestjs/common';
import { AllocatorService } from 'src/service/allocator/allocator.service';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import {
  AllocatorComplianceHistogramWeekResponse,
  AllocatorComplianceWeekResponse,
} from 'src/service/allocator/types.allocator';
import {
  HistogramWeekResponse,
  RetrievabilityWeekResponse,
} from 'src/service/histogram-helper/types.histogram-helper';
import { CacheTTL } from '@nestjs/cache-manager';

@Controller('stats/acc/allocators')
@CacheTTL(1000 * 60 * 60) // 1 hour
export class AllocatorsAccController {
  constructor(private readonly allocatorService: AllocatorService) {}

  @Get('retrievability')
  @ApiOkResponse({ type: RetrievabilityWeekResponse })
  async getAllocatorRetrievability(): Promise<RetrievabilityWeekResponse> {
    return await this.allocatorService.getAllocatorRetrievability(true);
  }

  @Get('biggest-client-distribution')
  @ApiOkResponse({ type: HistogramWeekResponse })
  async getAllocatorBiggestClientDistribution(): Promise<HistogramWeekResponse> {
    return await this.allocatorService.getAllocatorBiggestClientDistribution(
      true,
    );
  }

  @Get('sps-compliance')
  @ApiOperation({ deprecated: true })
  @ApiOkResponse({ type: AllocatorComplianceHistogramWeekResponse })
  async getAllocatorComplianceHistogram(): Promise<AllocatorComplianceHistogramWeekResponse> {
    return await this.allocatorService.getAllocatorComplianceHistogram(true);
  }

  @Get('sps-compliance-data')
  @ApiOkResponse({ type: AllocatorComplianceWeekResponse })
  async getAllocatorCompliance(): Promise<AllocatorComplianceWeekResponse> {
    return await this.allocatorService.getAllocatorCompliance(true);
  }
}
