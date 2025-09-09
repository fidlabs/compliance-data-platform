import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilPlusEditionRequest {
  @ApiPropertyOptional({
    description: 'FilPlus Edition ID to filter by',
    example: '6',
  })
  editionId?: string;
}
