import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import {
  StorageProviderComplianceMetrics,
  StorageProviderComplianceScoreRange,
} from 'src/service/storage-provider/types.storage-provider';
import { PaginationSortingInfo } from '../base/types.controller-base';

export class GetWeekStorageProvidersWithSpsComplianceRequestData {
  @ApiPropertyOptional({
    description: 'Requested week to check compliance for; default is last week',
    format: 'date',
  })
  week?: Date;

  @ApiPropertyOptional({
    example: new StorageProviderComplianceMetrics(),
    description:
      'Requested storage provider compliance metrics to check; default is all enabled',
    default: new StorageProviderComplianceMetrics(),
    type: StorageProviderComplianceMetrics,
  })
  spMetricsToCheck?: StorageProviderComplianceMetrics;
}

export class GetWeekStorageProvidersWithSpsComplianceRequest extends IntersectionType(
  GetWeekStorageProvidersWithSpsComplianceRequestData,
  PaginationSortingInfo,
) {
  @ApiPropertyOptional({
    description: 'Compliance score to filter by',
    enum: StorageProviderComplianceScoreRange,
  })
  complianceScore?: StorageProviderComplianceScoreRange;

  @ApiPropertyOptional({
    description: 'Storage provider ID to filter by',
  })
  provider?: string;
}

export class GetStorageProvidersRequest extends PaginationSortingInfo {
  @ApiPropertyOptional({
    description: 'Storage provider ID to filter by',
  })
  provider?: string;
}
