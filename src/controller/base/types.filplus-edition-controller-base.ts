import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilPlusEditionRequest {
  @ApiPropertyOptional({
    description:
      'FilPlus edition ID to filter by; default is all editions combined',
    example: '6',
  })
  editionId?: string;
}

export class FilPlusEditionDefaultCurrentRequest {
  @ApiPropertyOptional({
    description:
      'FilPlus edition ID to filter by; default is the current edition',
    example: '6',
  })
  editionId?: string;
}
