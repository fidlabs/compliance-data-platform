import {
  ApiProperty,
  ApiPropertyOptional,
  IntersectionType,
} from '@nestjs/swagger';
import { PaginationSortingInfo } from '../base/types.controller-base';
import { AllocatorComplianceScoreRange } from 'src/service/allocator/types.allocator';
import { stringifiedBool } from 'src/utils/utils';
import { StorageProviderComplianceMetricsRequest } from '../storage-providers/types.storage-providers';

class _GetAllocatorsRequest {
  @ApiPropertyOptional({
    description: 'Filter to apply to addressId, address, name or orgName',
  })
  filter?: string;

  @ApiPropertyOptional({
    description: 'Filter to apply to dcSource field; default is no filtering',
  })
  dcSource?: string;
}

export class GetAllocatorsRequest extends IntersectionType(
  _GetAllocatorsRequest,
  PaginationSortingInfo,
) {
  @ApiPropertyOptional({
    description: 'Flag to show inactive allocators; default is true',
    type: Boolean,
  })
  showInactive?: stringifiedBool;

  @ApiPropertyOptional({
    description:
      'Filter to apply to isMetaallocator field; default is no filtering',
    type: Boolean,
  })
  isMetaallocator?: stringifiedBool;
}

export class GetWeekAllocatorsWithSpsComplianceRequestData extends IntersectionType(
  StorageProviderComplianceMetricsRequest,
  _GetAllocatorsRequest,
) {
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
}
