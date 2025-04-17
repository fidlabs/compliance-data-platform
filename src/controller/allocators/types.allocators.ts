import {
  ApiProperty,
  ApiPropertyOptional,
  IntersectionType,
} from '@nestjs/swagger';
import { StorageProviderComplianceMetrics } from 'src/service/storage-provider/types.storage-provider';
import { PaginationSortingInfo } from '../base/types.controller-base';
import { AllocatorComplianceScoreRange } from '../../service/allocator/types.allocator';

export class GetWeekAllocatorsWithSpsComplianceRequestData {
  @ApiPropertyOptional({
    description: 'Requested week to check compliance for; default is last week',
    format: 'date',
  })
  week?: Date;

  @ApiProperty({
    example: 50,
    description: 'Requested compliance threshold percentage',
    default: 50,
    minimum: 0,
    maximum: 100,
  })
  complianceThresholdPercentage: number;

  @ApiPropertyOptional({
    example: new StorageProviderComplianceMetrics(),
    description:
      'Requested storage provider compliance metrics to check; default is all enabled',
    default: new StorageProviderComplianceMetrics(),
    type: StorageProviderComplianceMetrics,
  })
  spMetricsToCheck?: StorageProviderComplianceMetrics;
}

export class GetWeekAllocatorsWithSpsComplianceRequest extends IntersectionType(
  GetWeekAllocatorsWithSpsComplianceRequestData,
  PaginationSortingInfo,
) {
  @ApiPropertyOptional({
    description: 'Compliance score to filter by',
    enum: AllocatorComplianceScoreRange,
  })
  complianceScore?: AllocatorComplianceScoreRange;

  @ApiPropertyOptional({
    description: 'Allocator ID to filter by',
  })
  addressId?: string;
}

export class GetAllocatorsRequest extends PaginationSortingInfo {
  @ApiPropertyOptional({
    description: 'Allocator ID to filter by',
  })
  addressId?: string;
}
