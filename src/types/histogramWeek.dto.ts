import { ApiProperty } from '@nestjs/swagger';
import { HistogramDto } from './histogram.dto';

export class HistogramWeekDto {
  @ApiProperty({
    type: String,
    format: 'date',
    example: '2024-04-22T00:00:00.000Z',
  })
  week: Date;

  @ApiProperty({ type: HistogramDto, isArray: true })
  results: HistogramDto[];

  @ApiProperty()
  total: number;

  constructor(week: Date, results: HistogramDto[], total: number) {
    this.week = week;
    this.results = results;
    this.total = total;
  }
}
