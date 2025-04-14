import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { StorageProviderComplianceMetrics } from 'src/service/storage-provider/types.storage-provider';
import { PaginationSortingInfo } from '../base/types.controller-base';

export class GetWeekStorageProvidersWithSpsComplianceRequestData {
  @ApiPropertyOptional({
    description: 'Requested week to check compliance for; default is last week',
    format: 'date',
  })
  week?: Date;

  @ApiPropertyOptional({
    example: new StorageProviderComplianceMetrics(),
    description: 'Requested storage provider compliance metrics to check',
    default: new StorageProviderComplianceMetrics(),
    type: StorageProviderComplianceMetrics,
  })
  spMetricsToCheck: StorageProviderComplianceMetrics;
}

export class GetWeekStorageProvidersWithSpsComplianceRequest extends IntersectionType(
  GetWeekStorageProvidersWithSpsComplianceRequestData,
  PaginationSortingInfo,
) {}
