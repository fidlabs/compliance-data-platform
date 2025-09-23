import { ApiPropertyOptional } from '@nestjs/swagger';
import { FilPlusEditionRequest } from 'src/controller/base/types.filplus-edition-controller-base';
import { stringifiedBool } from 'src/utils/utils';

export enum RetrievabilityType {
  http = 'http',
  urlFinder = 'urlFinder',
}

export class GetRetrievabilityWeeklyRequest extends FilPlusEditionRequest {
  @ApiPropertyOptional({
    description: 'Flag to show open data only actors; default is false',
    type: Boolean,
  })
  openDataOnly?: stringifiedBool;

  @ApiPropertyOptional({
    description: 'Flag to filter by retrievability type',
    enum: RetrievabilityType,
  })
  retrievabilityType?: RetrievabilityType;
}
