import { Controller, Get } from '@nestjs/common';
import { AllocatorService } from '../../../../service/allocator/allocator.service';
import { RetrievabilityWeekResponseDto } from '../../../../types/retrievabilityWeekResponse.dto';
import { HistogramWeekResponseDto } from '../../../../types/histogramWeek.response.dto';
import { SpsComplianceWeekResponseDto } from '../../../../types/spsComplianceWeekResponse.dto';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { SpsComplianceHistogramWeekResponseDto } from 'src/types/spsComplianceHistogramWeekResponse.dto';

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
  @ApiOperation({ deprecated: true })
  @ApiOkResponse({ type: SpsComplianceHistogramWeekResponseDto })
  async getAllocatorSpsComplianceHistogram(): Promise<SpsComplianceHistogramWeekResponseDto> {
    return await this.allocatorAccService.getAllocatorSpsComplianceHistogram(
      true,
    );
  }

  @Get('sps-compliance-data')
  @ApiOkResponse({ type: SpsComplianceWeekResponseDto })
  async getAllocatorSpsCompliance(): Promise<SpsComplianceWeekResponseDto> {
    return await this.allocatorAccService.getAllocatorSpsCompliance(true);
  }
}
