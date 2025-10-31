import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { StorageProviderComplianceScoreRange } from 'src/service/storage-provider/types.storage-provider';
import { stringifiedBool } from 'src/utils/utils';
import { PaginationSortingInfoRequest } from '../base/types.controller-base';
import { FilPlusEditionRequest } from '../base/types.filplus-edition-controller-base';

export class StorageProviderComplianceMetricsRequest extends FilPlusEditionRequest {
  @ApiPropertyOptional({
    description: 'Flag to filter by HTTP retrievability type',
    type: Boolean,
  })
  httpRetrievability: stringifiedBool;

  @ApiPropertyOptional({
    description: 'Flag to filter by URL finder retrievability',
    type: Boolean,
  })
  urlFinderRetrievability: stringifiedBool;

  @ApiPropertyOptional({
    description:
      'Set to false to disable numberOfClients compliance metric check; default is true',
    type: Boolean,
  })
  numberOfClients?: stringifiedBool;

  @ApiPropertyOptional({
    description:
      'Set to false to disable totalDealSize compliance metric check; default is true',
    type: Boolean,
  })
  totalDealSize?: stringifiedBool;

  constructor(
    numberOfClients: stringifiedBool = 'true',
    totalDealSize: stringifiedBool = 'true',
    httpRetrievability: stringifiedBool = 'true',
    urlFinderRetrievability: stringifiedBool = 'true',
  ) {
    super();
    this.numberOfClients = numberOfClients;
    this.totalDealSize = totalDealSize;
    this.httpRetrievability = httpRetrievability;
    this.urlFinderRetrievability = urlFinderRetrievability;
  }
}

export class GetWeekStorageProvidersWithSpsComplianceRequestData extends StorageProviderComplianceMetricsRequest {
  @ApiPropertyOptional({
    description:
      'Requested week to check compliance for; default is last week; ISO format',
    format: 'date-time',
    example: '2024-04-22T00:00:00.000Z',
  })
  week?: string;
}

export class GetStorageProvidersRequest extends PaginationSortingInfoRequest {
  @ApiPropertyOptional({
    description: 'Storage provider ID to filter by',
  })
  provider?: string;
}

export class GetWeekStorageProvidersWithSpsComplianceRequest extends IntersectionType(
  GetWeekStorageProvidersWithSpsComplianceRequestData,
  GetStorageProvidersRequest,
) {
  @ApiPropertyOptional({
    description: 'Compliance score to filter by',
    enum: StorageProviderComplianceScoreRange,
  })
  complianceScore?: StorageProviderComplianceScoreRange;
}
