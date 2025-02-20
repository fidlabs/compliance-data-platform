import { ApiProperty } from '@nestjs/swagger';
import { StorageProviderComplianceWeekPercentage } from '../storage-provider/types.storage-provider';

export class AllocatorSpsComplianceWeekSingle extends StorageProviderComplianceWeekPercentage {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty()
  totalDatacap: number;
}

export class AllocatorSpsComplianceWeek {
  @ApiProperty({
    type: String,
    format: 'date',
    example: '2024-04-22T00:00:00.000Z',
  })
  week: Date;

  @ApiProperty()
  total: number;

  @ApiProperty({
    description:
      'Average storage providers retrievability success rate in the week',
  })
  averageSuccessRate: number;

  @ApiProperty({ type: AllocatorSpsComplianceWeekSingle, isArray: true })
  allocators: AllocatorSpsComplianceWeekSingle[];
}

export class AllocatorSpsComplianceWeekResponse {
  @ApiProperty({
    description:
      'Last week average storage providers retrievability success rate',
  })
  averageSuccessRate: number;

  @ApiProperty({ type: AllocatorSpsComplianceWeek, isArray: true })
  results: AllocatorSpsComplianceWeek[];

  constructor(
    averageSuccessRate: number,
    results: AllocatorSpsComplianceWeek[],
  ) {
    this.averageSuccessRate = averageSuccessRate;
    this.results = results;
  }
}
