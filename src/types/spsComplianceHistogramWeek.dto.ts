import { ProviderComplianceScoreRange } from './providerComplianceScoreRange';
import { HistogramWeekResponseDto } from './histogramWeek.response.dto';
import { ApiProperty } from '@nestjs/swagger';

export class SpsComplianceHistogramWeekDto {
  @ApiProperty({ enum: ProviderComplianceScoreRange })
  scoreRange: ProviderComplianceScoreRange;

  @ApiProperty({ type: HistogramWeekResponseDto })
  histogram: HistogramWeekResponseDto;

  public static of(
    scoreRange: ProviderComplianceScoreRange,
    histogram: HistogramWeekResponseDto,
  ) {
    const dto = new SpsComplianceHistogramWeekDto();

    dto.scoreRange = scoreRange;
    dto.histogram = histogram;

    return dto;
  }
}
