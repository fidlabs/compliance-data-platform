import { ApiProperty } from '@nestjs/swagger';
import {
  OldDatacapAllocatorBalanceWeek,
  OldDatacapClientBalanceWeek,
} from 'src/service/old-datacap/types.old-datacap';

export class OldDatacapAllocatorBalanceWeekResponse {
  @ApiProperty({
    type: OldDatacapAllocatorBalanceWeek,
    description: 'Allocators datacap balance by week',
    isArray: true,
  })
  results: OldDatacapAllocatorBalanceWeek[];
}

export class OldDatacapClientBalanceWeekResponse {
  @ApiProperty({
    type: OldDatacapClientBalanceWeek,
    description: 'Clients datacap balance by week',
    isArray: true,
  })
  results: OldDatacapClientBalanceWeek[];
}
