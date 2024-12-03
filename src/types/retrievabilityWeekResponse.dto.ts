import { HistogramWeekResponseDto } from './histogramWeek.response.dto';
import { ApiProperty } from '@nestjs/swagger';

export class RetrievabilityWeekResponseDto {
  @ApiProperty()
  averageSuccessRate: number;

  @ApiProperty({ type: HistogramWeekResponseDto })
  histogram: HistogramWeekResponseDto;

  public static of(
    averageSuccessRate: number,
    histogram: HistogramWeekResponseDto,
  ): RetrievabilityWeekResponseDto {
    const dto = new RetrievabilityWeekResponseDto();

    dto.averageSuccessRate = averageSuccessRate;
    dto.histogram = histogram;

    return dto;
  }
}
