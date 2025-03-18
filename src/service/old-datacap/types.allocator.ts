import { ApiProperty } from '@nestjs/swagger';

export class OldDatacapAllocatorBalanceWeek {
  @ApiProperty({
    type: String,
    format: 'date',
    example: '2024-04-22T00:00:00.000Z',
  })
  week: Date;

  @ApiProperty({
    description: 'Total old datacap owned by allocators that week',
  })
  totalOldDatacap: bigint;

  @ApiProperty({
    description:
      'Total number of allocators that had some old balance that week',
  })
  totalAllocators: number;
}

export class OldDatacapAllocatorBalanceWeekResponse {
  @ApiProperty({
    type: OldDatacapAllocatorBalanceWeek,
    description: 'Allocators datacap balance by week',
    isArray: true,
  })
  results: OldDatacapAllocatorBalanceWeek[];
}
