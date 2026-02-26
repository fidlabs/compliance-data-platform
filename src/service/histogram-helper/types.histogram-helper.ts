import { ApiProperty } from '@nestjs/swagger';

export class HistogramDateValueResults {
  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2024-04-22T00:00:00.000Z',
    description: 'ISO format',
  })
  date: Date;

  @ApiProperty({
    description: 'Histogram value (e.g. value of metric)',
  })
  value: number;

  constructor(date: Date, value: number) {
    this.date = date;
    this.value = value;
  }
}

export class HistogramBase {
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

export class HistogramTotalDatacap extends HistogramBase {
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
    super(valueFromExclusive, valueToInclusive, count);
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

  @ApiProperty({ type: HistogramTotalDatacap, isArray: true })
  results: HistogramTotalDatacap[];

  constructor(week: Date, total: number, results: HistogramTotalDatacap[]) {
    this.week = week;
    this.total = total;
    this.results = results;
  }
}

export class HistogramBaseResults {
  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2024-04-22T00:00:00.000Z',
    description: 'ISO format',
  })
  date: Date;

  @ApiProperty({
    description: 'Number of allocators / storage providers in the week',
  })
  total: number;

  @ApiProperty({ type: HistogramBase, isArray: true })
  results: HistogramBase[];

  constructor(day: Date, total: number, results: HistogramBase[]) {
    this.date = day;
    this.total = total;
    this.results = results;
  }
}

export class HistogramWeekFlat extends HistogramTotalDatacap {
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
    description: 'Average URL Finder retrievability success rate in the week',
  })
  averageUrlFinderSuccessRate: number;

  constructor(
    week: Date,
    total: number,
    results: HistogramTotalDatacap[],
    averageUrlFinderSuccessRate: number,
  ) {
    super(week, total, results);
    this.averageUrlFinderSuccessRate = averageUrlFinderSuccessRate;
  }

  public static of(
    histogramWeek: HistogramWeekResults,
    averageUrlFinderSuccessRate: number,
  ): RetrievabilityHistogramWeek {
    return new RetrievabilityHistogramWeek(
      histogramWeek.week,
      histogramWeek.total,
      histogramWeek.results,
      averageUrlFinderSuccessRate,
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
    description:
      'Last full week average URL Finder retrievability success rate',
    nullable: true,
  })
  averageUrlFinderSuccessRate: number | null;

  @ApiProperty({ type: RetrievabilityHistogramWeekResults })
  histogram: RetrievabilityHistogramWeekResults;

  constructor(
    averageUrlFinderSuccessRate: number | null,
    histogram: RetrievabilityHistogramWeekResults,
  ) {
    this.averageUrlFinderSuccessRate = averageUrlFinderSuccessRate;
    this.histogram = histogram;
  }
}
