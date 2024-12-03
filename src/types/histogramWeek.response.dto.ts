import { ApiProperty } from '@nestjs/swagger';
import { HistogramWeekDto } from './histogramWeek.dto';

export class HistogramWeekResponseDto {
  @ApiProperty()
  total: number;

  @ApiProperty({ type: HistogramWeekDto, isArray: true })
  results: HistogramWeekDto[];

  constructor(total: number, results: HistogramWeekDto[]) {
    this.total = total;
    this.results = results;
  }
}
