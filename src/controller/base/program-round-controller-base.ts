import { ApiProperty } from '@nestjs/swagger';
import { DEFAULT_FILPLUS_EDITION_ID } from 'src/utils/filplus-edition';

export class FilPlusEditionRequest {
  @ApiProperty({
    description: 'FilPlus Edition ID to filter by',
    example: '6',
    type: String,
    default: DEFAULT_FILPLUS_EDITION_ID,
  })
  roundId: string;
}
