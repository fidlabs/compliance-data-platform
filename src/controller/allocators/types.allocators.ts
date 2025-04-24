import {
  ApiProperty,
  ApiPropertyOptional,
  IntersectionType,
} from '@nestjs/swagger';
import { StorageProviderComplianceMetrics } from 'src/service/storage-provider/types.storage-provider';
import { PaginationSortingInfo } from '../base/types.controller-base';
import { AllocatorComplianceScoreRange } from '../../service/allocator/types.allocator';

export class GetWeekAllocatorsWithSpsComplianceRequestData extends StorageProviderComplianceMetrics {
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

export class GetAllocatorsRequest extends PaginationSortingInfo {
  @ApiPropertyOptional({
    description: 'Filter to apply to addressId, address, name or orgName',
  })
  filter?: string;
}

export class GetWeekAllocatorsWithSpsComplianceRequest extends IntersectionType(
  GetWeekAllocatorsWithSpsComplianceRequestData,
  GetAllocatorsRequest,
) {
  @ApiPropertyOptional({
    description: 'Compliance score to filter by',
    enum: AllocatorComplianceScoreRange,
  })
  complianceScore?: AllocatorComplianceScoreRange;
}
