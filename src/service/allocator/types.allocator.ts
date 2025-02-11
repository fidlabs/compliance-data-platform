import { ApiProperty } from '@nestjs/swagger';
import { StorageProviderComplianceWeekPercentage } from '../storage-provider/types.storage-provider';

export class AllocatorComplianceWeekSingle extends StorageProviderComplianceWeekPercentage {
  @ApiProperty({ type: String })
  id: string;
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
