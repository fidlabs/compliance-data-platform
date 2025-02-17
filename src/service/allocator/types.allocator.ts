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

  @ApiProperty({ type: AllocatorSpsComplianceWeekSingle, isArray: true })
  allocators: AllocatorSpsComplianceWeekSingle[];

  @ApiProperty()
  total: number;
}

export class AllocatorSpsComplianceWeekResponse {
  @ApiProperty({ type: AllocatorSpsComplianceWeek, isArray: true })
  results: AllocatorSpsComplianceWeek[];

  constructor(results: AllocatorSpsComplianceWeek[]) {
    this.results = results;
  }
}
