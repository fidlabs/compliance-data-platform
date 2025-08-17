import { ApiProperty } from '@nestjs/swagger';
import {
  StorageProviderComplianceMetrics,
  StorageProviderComplianceWeekPercentage,
} from '../storage-provider/types.storage-provider';

export class AllocatorDatacapFlowData {
  @ApiProperty({ description: 'Allocator ID' })
  allocatorId: string;

  @ApiProperty({
    description: 'Allocator name',
    nullable: true,
  })
  allocatorName: string | null;

  @ApiProperty({
    description: 'Datacap of the allocator',
    type: String,
    format: 'int64',
    example: '42',
  })
  datacap: bigint;

  @ApiProperty({
    description: 'Allocator metapathway type',
    nullable: true,
  })
  metapathwayType: string | null;

  @ApiProperty({
    description: 'Allocator application audit',
    nullable: true,
  })
  applicationAudit: string | null;
}

export class AllocatorAuditTimesData {
  @ApiProperty({
    description:
      'Average times from audit started time to ended time for each audit round in seconds',
    isArray: true,
    type: Number,
  })
  averageAuditTimesSecs: number[];

  @ApiProperty({
    description:
      'Average times from audit ended time to datacap allocated time for each audit round in seconds',
    isArray: true,
    type: Number,
  })
  averageAllocationTimesSecs: number[];
}

export enum AllocatorAuditStateOutcome {
  passed = 'passed',
  passedConditionally = 'passedConditionally',
}

export class AllocatorAuditStateAudits {
  @ApiProperty({
    format: 'date-time',
    example: '2024-04-22T00:00:00.000Z',
    description: 'Timestamp when the audit ended; ISO format',
  })
  ended: string;

  @ApiProperty({
    format: 'date-time',
    example: '2024-04-22T00:00:00.000Z',
    description: 'Timestamp when the audit started; ISO format',
  })
  started: string;

  @ApiProperty({
    description: 'Audit outcome',
    enum: AllocatorAuditStateOutcome,
  })
  outcome: AllocatorAuditStateOutcome;

  @ApiProperty({
    format: 'date-time',
    example: '2024-04-22T00:00:00.000Z',
    description: 'Timestamp when datacap was allocated; ISO format',
  })
  dc_allocated: string;

  @ApiProperty({
    description: 'Datacap amount allocated in the audit in PiB',
  })
  datacap_amount: number;
}

export class AllocatorAuditStateData {
  @ApiProperty({ description: 'Allocator ID' })
  allocatorId: string;

  @ApiProperty({
    description: 'Allocator name',
    nullable: true,
  })
  allocatorName: string | null;

  @ApiProperty({
    description: 'Allocator audits',
    isArray: true,
    type: AllocatorAuditStateAudits,
  })
  audits: AllocatorAuditStateAudits[];
}

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
  @ApiProperty({ description: 'Allocator ID' })
  id: string;

  @ApiProperty({
    description: 'Total datacap of the allocator in the week',
    type: String,
    format: 'int64',
    example: '42',
  })
  totalDatacap: bigint;

  @ApiProperty({
    description:
      'Total number of storage providers for the allocator in the week',
  })
  totalSps: number;
}

export class AllocatorSpsComplianceWeekResults {
  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2024-04-22T00:00:00.000Z',
    description: 'ISO format',
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

export class AllocatorSpsComplianceWeek {
  @ApiProperty({
    description: 'Storage providers compliance metrics checked',
  })
  metricsChecked: StorageProviderComplianceMetrics;

  @ApiProperty({
    description:
      'Last full week average storage providers retrievability success rate',
  })
  averageSuccessRate: number;

  @ApiProperty({ type: AllocatorSpsComplianceWeekResults, isArray: true })
  results: AllocatorSpsComplianceWeekResults[];

  constructor(
    metricsChecked: StorageProviderComplianceMetrics,
    averageSuccessRate: number,
    results: AllocatorSpsComplianceWeekResults[],
  ) {
    this.metricsChecked = metricsChecked;
    this.averageSuccessRate = averageSuccessRate;
    this.results = results;
  }
}
