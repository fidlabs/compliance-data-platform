import { ApiPropertyOptional } from '@nestjs/swagger';
import { FilPlusEditionRequest } from 'src/controller/base/types.filplus-edition-controller-base';
import { StorageProviderRetrievabilityType } from 'src/service/storage-provider-url-finder/types.storage-provider-url-finder.service';
import { stringifiedBool } from 'src/utils/utils';

class BaseRetrievabilityWeeklyRequest extends FilPlusEditionRequest {
  @ApiPropertyOptional({
    description: 'Flag to show open data only actors; default is false',
    type: Boolean,
  })
  openDataOnly?: stringifiedBool;
}

export class GetAllocatorRetrievabilityWeeklyRequest extends BaseRetrievabilityWeeklyRequest {}

export class GetStorageProviderRetrievabilityWeeklyRequest extends BaseRetrievabilityWeeklyRequest {
  @ApiPropertyOptional({
    description:
      'Flag to show retrevability type; default is RPA; possible values are RPA, CONSISTENT and INCONSISTENT',
    enum: StorageProviderRetrievabilityType,
    default: StorageProviderRetrievabilityType.RPA,
  })
  retrievabilityType?: StorageProviderRetrievabilityType;
}
