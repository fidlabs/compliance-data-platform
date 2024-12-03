import { Controller, Get } from '@nestjs/common';
import { AllocatorService } from '../../../service/allocator/allocator.service';
import { RetrievabilityWeekResponseDto } from '../../../types/retrievabilityWeekResponse.dto';
import { HistogramWeekResponseDto } from '../../../types/histogramWeek.response.dto';
import { SpsComplianceWeekResponseDto } from '../../../types/spsComplianceWeekResponse.dto';
import { ApiOkResponse } from '@nestjs/swagger';

@Controller('stats/allocators')
export class AllocatorsController {
  constructor(private readonly allocatorService: AllocatorService) {}

  @Get('retrievability')
  @ApiOkResponse({ type: RetrievabilityWeekResponseDto })
  async getAllocatorRetrievability(): Promise<RetrievabilityWeekResponseDto> {
    return await this.allocatorService.getAllocatorRetrievability(false);
  }

  @Get('biggest-client-distribution')
  @ApiOkResponse({ type: HistogramWeekResponseDto })
  async getAllocatorBiggestClientDistribution(): Promise<HistogramWeekResponseDto> {
    return await this.allocatorService.getAllocatorBiggestClientDistribution(
      false,
    );
  }

  @Get('sps-compliance')
  @ApiOkResponse({ type: SpsComplianceWeekResponseDto })
  async getAllocatorSpsCompliance(): Promise<SpsComplianceWeekResponseDto> {
    return await this.allocatorService.getAllocatorSpsCompliance(false);
  }
}
