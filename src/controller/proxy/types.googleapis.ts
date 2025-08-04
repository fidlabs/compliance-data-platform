import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetAllocatorsOverviewRequest {
  @ApiPropertyOptional({
    example: 'GRAPHS',
    description: 'Requested spreadsheet tab name',
    default: 'GRAPHS',
  })
  tab?: string;
}
