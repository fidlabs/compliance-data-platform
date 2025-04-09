import { ApiPropertyOptional } from '@nestjs/swagger';
import { StorageProviderComplianceMetrics } from 'src/service/storage-provider/types.storage-provider';
import { PaginationSortingInfo } from '../base/types.controller-base';

export class GetWeekAllocatorsWithSpsComplianceRequest extends PaginationSortingInfo {
  @ApiPropertyOptional({
    description: 'Requested week to check compliance for; default is last week',
    format: 'date',
  })
  week?: Date;

  @ApiPropertyOptional({
    example: 50,
    description: 'Requested compliance threshold percentage',
    default: 50,
    minimum: 0,
    maximum: 100,
  })
  complianceThresholdPercentage: number;

  @ApiPropertyOptional({
    example: new StorageProviderComplianceMetrics(),
    description: 'Requested storage provider compliance metrics to check',
    default: new StorageProviderComplianceMetrics(),
    type: StorageProviderComplianceMetrics,
  })
  spMetricsToCheck: StorageProviderComplianceMetrics;
}
