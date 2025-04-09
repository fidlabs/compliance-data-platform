import { ApiProperty } from '@nestjs/swagger';
import {
  StorageProviderComplianceMetricsResponse,
  StorageProviderComplianceWeekPercentage,
} from '../storage-provider/types.storage-provider';

export enum AllocatorComplianceScoreRange {
  NonCompliant = 'nonCompliant',
  PartiallyCompliant = 'partiallyCompliant',
  Compliant = 'compliant',
}

export class AllocatorComplianceScore {
  complianceScore: AllocatorComplianceScoreRange;
  allocator: string;
}

export class AllocatorSpsComplianceWeekSingle extends StorageProviderComplianceWeekPercentage {
  @ApiProperty({ type: String, description: 'Allocator ID' })
  id: string;

  @ApiProperty({
    description: 'Total datacap of the allocator in the week',
  })
  totalDatacap: number;

  @ApiProperty({
    description:
      'Total number of storage providers for the allocator in the week',
  })
  totalSps: number;
}

export class AllocatorSpsComplianceWeek {
  @ApiProperty({
    type: String,
    format: 'date',
    example: '2024-04-22T00:00:00.000Z',
  })
  week: Date;

  @ApiProperty()
  total: number;

  @ApiProperty({
    description:
      'Average storage providers retrievability success rate in the week',
  })
  averageSuccessRate: number;

  @ApiProperty({ type: AllocatorSpsComplianceWeekSingle, isArray: true })
  allocators: AllocatorSpsComplianceWeekSingle[];
}

export class AllocatorSpsComplianceWeekResponse {
  @ApiProperty({
    description: 'Storage providers compliance metrics checked',
  })
  metricsChecked: StorageProviderComplianceMetricsResponse;

  @ApiProperty({
    description:
      'Last full week average storage providers retrievability success rate',
  })
  averageSuccessRate: number;

  @ApiProperty({ type: AllocatorSpsComplianceWeek, isArray: true })
  results: AllocatorSpsComplianceWeek[];

  constructor(
    metricsChecked: StorageProviderComplianceMetricsResponse,
    averageSuccessRate: number,
    results: AllocatorSpsComplianceWeek[],
  ) {
    this.metricsChecked = metricsChecked;
    this.averageSuccessRate = averageSuccessRate;
    this.results = results;
  }
}
