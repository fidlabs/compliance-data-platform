import { ApiPropertyOptional } from '@nestjs/swagger';
import { stringifiedBool } from 'src/utils/utils';

export class GetRetrievabilityWeeklyRequest {
  @ApiPropertyOptional({
    description: 'Flag to show open data only actors; default is false',
    type: Boolean,
  })
  openDataOnly?: stringifiedBool;

  @ApiPropertyOptional({
    description:
      'Flag to show http retrievability; default is false - standard retrievability',
    type: Boolean,
  })
  httpRetrievability?: stringifiedBool;
}
