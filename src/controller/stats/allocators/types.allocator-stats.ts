import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProgramRoundFilter } from 'src/controller/base/program-round-controller-base';
import { stringifiedBool } from 'src/utils/utils';

export class GetRetrievabilityWeeklyRequest extends ProgramRoundFilter {
  @ApiPropertyOptional({
    description: 'Flag to show open data only actors; default is false',
    type: Boolean,
  })
  openDataOnly?: stringifiedBool;

  @ApiPropertyOptional({
    description:
      'Flag to show http retrievability; default is false - overall retrievability',
    type: Boolean,
  })
  httpRetrievability?: stringifiedBool;
}
