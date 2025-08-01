import { ApiPropertyOptional } from '@nestjs/swagger';

export class ProgramRoundFilter {
  @ApiPropertyOptional({
    description: 'Program round ID to filter by',
    example: '5',
  })
  roundId?: number;
}
