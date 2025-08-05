import { ApiPropertyOptional } from '@nestjs/swagger';

export class ProgramRoundFilter {
  @ApiPropertyOptional({
    description: 'Program round ID to filter by',
    example: '6',
  })
  roundId?: number;
}
