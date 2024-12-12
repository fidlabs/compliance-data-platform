import { ApiProperty } from '@nestjs/swagger';
import { SpsComplianceSingleAllocatorDto } from './spsComplianceSingleAllocator.dto';

export class SpsComplianceWeekDto {
  @ApiProperty({
    type: String,
    format: 'date',
    example: '2024-04-22T00:00:00.000Z',
  })
  week: Date;

  @ApiProperty({ type: SpsComplianceSingleAllocatorDto, isArray: true })
  allocators: SpsComplianceSingleAllocatorDto[];

  @ApiProperty()
  total: number;
}
