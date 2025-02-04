import { ApiProperty } from '@nestjs/swagger';

export class Histogram {
  @ApiProperty({ nullable: true })
  valueFromExclusive: number | null;

  @ApiProperty({ nullable: true })
  valueToInclusive: number | null;

  @ApiProperty({ nullable: true })
  count: number | null;

  constructor(
    valueFromExclusive: number | null,
    valueToInclusive: number | null,
    count: number | null,
  ) {
    this.valueFromExclusive = valueFromExclusive;
    this.valueToInclusive = valueToInclusive;
    this.count = count;
  }
}

export class HistogramWeek {
  @ApiProperty({
    type: String,
    format: 'date',
    example: '2024-04-22T00:00:00.000Z',
  })
  week: Date;

  @ApiProperty({ type: Histogram, isArray: true })
  results: Histogram[];

  @ApiProperty()
  total: number;

  constructor(week: Date, results: Histogram[], total: number) {
    this.week = week;
    this.results = results;
    this.total = total;
  }
}

export class HistogramWeekResponse {
  @ApiProperty()
  total: number;

  @ApiProperty({ type: HistogramWeek, isArray: true })
  results: HistogramWeek[];

  constructor(total: number, results: HistogramWeek[]) {
    this.total = total;
    this.results = results;
  }
}

export class RetrievabilityWeekResponse {
  @ApiProperty()
  averageSuccessRate: number;

  @ApiProperty({ type: HistogramWeekResponse })
  histogram: HistogramWeekResponse;

  public static of(
    averageSuccessRate: number,
    histogram: HistogramWeekResponse,
  ): RetrievabilityWeekResponse {
    const dto = new RetrievabilityWeekResponse();

    dto.averageSuccessRate = averageSuccessRate;
    dto.histogram = histogram;

    return dto;
  }
}
