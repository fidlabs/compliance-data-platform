import { ApiProperty } from '@nestjs/swagger';

export class SpsComplianceSingleAllocatorDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: Number })
  compliantSpsPercentage: number;

  @ApiProperty({ type: Number })
  partiallyCompliantSpsPercentage: number;

  @ApiProperty({ type: Number })
  nonCompliantSpsPercentage: number;
}
