import { Controller, Get } from '@nestjs/common';
import { AllocatorService } from '../../../../service/allocator/allocator.service';
import { RetrievabilityWeekResponseDto } from '../../../../types/retrievabilityWeekResponse.dto';
import { HistogramWeekResponseDto } from '../../../../types/histogramWeek.response.dto';
import { SpsComplianceWeekResponseDto } from '../../../../types/spsComplianceWeekResponse.dto';
import { ApiOkResponse } from '@nestjs/swagger';

@Controller('stats/acc/allocators')
export class AllocatorsAccController {
  constructor(private readonly allocatorAccService: AllocatorService) {}

  @Get('retrievability')
  @ApiOkResponse({ type: RetrievabilityWeekResponseDto })
  async getAllocatorRetrievability(): Promise<RetrievabilityWeekResponseDto> {
    return await this.allocatorAccService.getAllocatorRetrievability(true);
  }

  @Get('biggest-client-distribution')
  @ApiOkResponse({ type: HistogramWeekResponseDto })
  async getAllocatorBiggestClientDistribution(): Promise<HistogramWeekResponseDto> {
    return await this.allocatorAccService.getAllocatorBiggestClientDistribution(
      true,
    );
  }

  @Get('sps-compliance')
  @ApiOkResponse({ type: SpsComplianceWeekResponseDto })
  async getAllocatorSpsCompliance(): Promise<SpsComplianceWeekResponseDto> {
    return await this.allocatorAccService.getAllocatorSpsCompliance(true);
  }
}
