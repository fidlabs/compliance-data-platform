import {
  ApiProperty,
  ApiPropertyOptional,
  IntersectionType,
} from '@nestjs/swagger';
import {
  AllocatorComplianceScoreRange,
  AllocatorDatacapFlowData,
} from 'src/service/allocator/types.allocator';
import { stringifiedBool } from 'src/utils/utils';
import { PaginationSortingInfoRequest } from '../base/types.controller-base';
import { FilPlusEditionRequest } from '../base/types.filplus-edition-controller-base';
import { StorageProviderComplianceMetricsRequest } from '../storage-providers/types.storage-providers';

export class GetDatacapFlowDataRequest {
  @ApiPropertyOptional({
    description:
      'Requested date to fetch historical data to; default is now, meaning all available data; ISO format',
    format: 'date-time',
    example: '2024-04-22T00:00:00.000Z',
  })
  cutoffDate?: string;
}

export class GetDatacapFlowDataResponse {
  @ApiProperty({
    type: String,
    description: 'Requested date; ISO format',
    format: 'date-time',
    example: '2024-04-22T00:00:00.000Z',
  })
  cutoffDate: Date;

  @ApiProperty({
    description: 'FilPlus edition ID the data is relevant to',
    example: 6,
  })
  filPlusEditionId: number;

  @ApiProperty({
    isArray: true,
    type: AllocatorDatacapFlowData,
    description: 'Datacap flow data up to the requested date',
  })
  data: AllocatorDatacapFlowData[];
}

class _GetAllocatorsRequest extends FilPlusEditionRequest {
  @ApiPropertyOptional({
    description: 'Filter to apply to addressId, address, name or orgName',
  })
  filter?: string;

  @ApiPropertyOptional({
    description:
      'Filter to find allocators using given metaallocator id or address; default is no filtering',
  })
  usingMetaallocator?: string;
}

export class GetAllocatorsRequest extends IntersectionType(
  _GetAllocatorsRequest,
  PaginationSortingInfoRequest,
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
    description:
      'Requested week to check compliance for; default is last week; ISO format',
    format: 'date-time',
    example: '2024-04-22T00:00:00.000Z',
  })
  week?: string;

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
  PaginationSortingInfoRequest,
) {
  @ApiPropertyOptional({
    description: 'Compliance score to filter by',
    enum: AllocatorComplianceScoreRange,
  })
  complianceScore?: AllocatorComplianceScoreRange;
}

export class GetAllocatorReportRequest {
  @ApiPropertyOptional({
    description: 'Page number, starts from 1; default is no pagination',
  })
  clientPaginationPage?: string;

  @ApiPropertyOptional({
    description: 'Number of items per page; default is no pagination',
  })
  clientPaginationLimit?: string;

  @ApiPropertyOptional({
    description: 'Page number, starts from 1; default is no pagination',
  })
  providerPaginationPage?: string;

  @ApiPropertyOptional({
    description: 'Number of items per page; default is no pagination',
  })
  providerPaginationLimit?: string;
}
