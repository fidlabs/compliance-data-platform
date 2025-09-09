import { ApiProperty } from '@nestjs/swagger';

export class Histogram {
  @ApiProperty({
    description: 'Bucket (valueFromExclusive, valueToInclusive> starting value',
  })
  valueFromExclusive: number;

  @ApiProperty({
    description: 'Bucket (valueFromExclusive, valueToInclusive> ending value',
  })
  valueToInclusive: number;

  @ApiProperty({
    description: 'Number of allocators / storage providers in the bucket',
  })
  count: number;

  @ApiProperty({
    description:
      'Total datacap of allocators / storage providers in the bucket',
    type: String,
    format: 'int64',
    example: '42',
  })
  totalDatacap: bigint;

  constructor(
    valueFromExclusive: number,
    valueToInclusive: number,
    count: number,
    totalDatacap: bigint,
  ) {
    this.valueFromExclusive = valueFromExclusive;
    this.valueToInclusive = valueToInclusive;
    this.count = count;
    this.totalDatacap = totalDatacap;
  }
}

export class HistogramWeekResults {
  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2024-04-22T00:00:00.000Z',
    description: 'ISO format',
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
    totalDatacap: bigint,
    week: Date,
  ) {
    super(valueFromExclusive, valueToInclusive, count, totalDatacap);
    this.week = week;
  }
}

export class RetrievabilityHistogramWeek extends HistogramWeekResults {
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
    histogramWeek: HistogramWeekResults,
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

export class HistogramWeek {
  @ApiProperty({
    description: 'Total number of allocators / storage providers',
  })
  total: number;

  @ApiProperty({ type: HistogramWeekResults, isArray: true })
  results: HistogramWeekResults[];

  constructor(total: number, results: HistogramWeekResults[]) {
    this.total = total;
    this.results = results;
  }
}

export class RetrievabilityHistogramWeekResults {
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

export class RetrievabilityWeek {
  @ApiProperty({
    description: 'Last full week average retrievability success rate',
    nullable: true,
  })
  averageSuccessRate: number | null;

  @ApiProperty({ type: RetrievabilityHistogramWeekResults })
  histogram: RetrievabilityHistogramWeekResults;

  constructor(
    averageSuccessRate: number,
    histogram: RetrievabilityHistogramWeekResults,
  ) {
    this.averageSuccessRate = averageSuccessRate;
    this.histogram = histogram;
  }
}
