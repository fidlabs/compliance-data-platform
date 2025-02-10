import { ApiProperty } from '@nestjs/swagger';

export class Histogram {
  @ApiProperty()
  valueFromExclusive: number;

  @ApiProperty()
  valueToInclusive: number;

  @ApiProperty()
  count: number;

  constructor(
    valueFromExclusive: number,
    valueToInclusive: number,
    count: number,
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

  @ApiProperty({
    description: 'Number of allocators / storage providers in the week',
  })
  total: number;

  @ApiProperty({ type: Histogram, isArray: true })
  results: Histogram[];

  constructor(week: Date, total: number, results: Histogram[]) {
    this.week = week;
    this.total = total;
    this.results = results;
  }
}

export class HistogramWeekFlat extends Histogram {
  week: Date;

  constructor(
    valueFromExclusive: number,
    valueToInclusive: number,
    count: number,
    week: Date,
  ) {
    super(valueFromExclusive, valueToInclusive, count);
    this.week = week;
  }
}

export class RetrievabilityHistogramWeek extends HistogramWeek {
  @ApiProperty({
    description: 'Average retrievability success rate in the week',
  })
  averageSuccessRate: number;

  constructor(
    week: Date,
    total: number,
    results: Histogram[],
    averageSuccessRate: number,
  ) {
    super(week, total, results);
    this.averageSuccessRate = averageSuccessRate;
  }

  public static of(
    histogramWeek: HistogramWeek,
    averageSuccessRate: number,
  ): RetrievabilityHistogramWeek {
    return new RetrievabilityHistogramWeek(
      histogramWeek.week,
      histogramWeek.total,
      histogramWeek.results,
      averageSuccessRate,
    );
  }
}

export class HistogramWeekResponse {
  @ApiProperty({
    description: 'Total number of allocators / storage providers',
  })
  total: number;

  @ApiProperty({ type: HistogramWeek, isArray: true })
  results: HistogramWeek[];

  constructor(total: number, results: HistogramWeek[]) {
    this.total = total;
    this.results = results;
  }
}

export class RetrievabilityHistogramWeekResponse {
  @ApiProperty({
    description: 'Total number of allocators / storage providers',
  })
  total: number;

  @ApiProperty({ type: RetrievabilityHistogramWeek, isArray: true })
  results: RetrievabilityHistogramWeek[];

  constructor(total: number, results: RetrievabilityHistogramWeek[]) {
    this.total = total;
    this.results = results;
  }
}

export class RetrievabilityWeekResponse {
  @ApiProperty({
    description: 'Last week average retrievability success rate',
  })
  averageSuccessRate: number;

  @ApiProperty({ type: RetrievabilityHistogramWeekResponse })
  histogram: RetrievabilityHistogramWeekResponse;

  constructor(
    averageSuccessRate: number,
    histogram: RetrievabilityHistogramWeekResponse,
  ) {
    this.averageSuccessRate = averageSuccessRate;
    this.histogram = histogram;
  }
}
