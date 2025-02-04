import { ApiProperty } from '@nestjs/swagger';
import { ProviderComplianceScoreRange } from '../storage-provider/types.storage-provider';
import { HistogramWeekResponse } from '../histogram-helper/types.histogram-helper';

export class AllocatorComplianceWeekSingle {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: Number })
  compliantSpsPercentage: number;

  @ApiProperty({ type: Number })
  partiallyCompliantSpsPercentage: number;

  @ApiProperty({ type: Number })
  nonCompliantSpsPercentage: number;
}

export class AllocatorComplianceWeek {
  @ApiProperty({
    type: String,
    format: 'date',
    example: '2024-04-22T00:00:00.000Z',
  })
  week: Date;

  @ApiProperty({ type: AllocatorComplianceWeekSingle, isArray: true })
  allocators: AllocatorComplianceWeekSingle[];

  @ApiProperty()
  total: number;
}

export class AllocatorComplianceWeekResponse {
  @ApiProperty({ type: AllocatorComplianceWeek, isArray: true })
  results: AllocatorComplianceWeek[];

  constructor(results: AllocatorComplianceWeek[]) {
    this.results = results;
  }
}

export class AllocatorComplianceHistogramWeek {
  @ApiProperty({ enum: ProviderComplianceScoreRange })
  scoreRange: ProviderComplianceScoreRange;

  @ApiProperty({ type: HistogramWeekResponse })
  histogram: HistogramWeekResponse;

  public static of(
    scoreRange: ProviderComplianceScoreRange,
    histogram: HistogramWeekResponse,
  ) {
    const dto = new AllocatorComplianceHistogramWeek();

    dto.scoreRange = scoreRange;
    dto.histogram = histogram;

    return dto;
  }
}

export class AllocatorComplianceHistogramWeekResponse {
  @ApiProperty({ type: AllocatorComplianceHistogramWeek, isArray: true })
  results: AllocatorComplianceHistogramWeek[];

  constructor(results: AllocatorComplianceHistogramWeek[]) {
    this.results = results;
  }
}
