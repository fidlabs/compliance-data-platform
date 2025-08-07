import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { StorageProviderComplianceScoreRange } from 'src/service/storage-provider/types.storage-provider';
import { PaginationSortingInfoRequest } from '../base/types.controller-base';
import { stringifiedBool } from 'src/utils/utils';

export class StorageProviderComplianceMetricsRequest {
  @ApiPropertyOptional({
    description:
      'Set to false to disable retrievability compliance metric check; default is true',
    type: Boolean,
  })
  retrievability?: stringifiedBool;

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
    retrievability: stringifiedBool = 'true',
    numberOfClients: stringifiedBool = 'true',
    totalDealSize: stringifiedBool = 'true',
  ) {
    this.retrievability = retrievability;
    this.numberOfClients = numberOfClients;
    this.totalDealSize = totalDealSize;
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
