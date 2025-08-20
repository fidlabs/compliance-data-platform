import { ApiProperty } from '@nestjs/swagger';

export class FilPlusEditionRequest {
  @ApiProperty({
    description: 'FilPlus Edition ID to filter by',
    example: '6',
  })
  editionId?: string;
}
