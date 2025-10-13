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
    description: 'Allocator metapathway type; null for FilPlus edition 5 data',
    nullable: true,
  })
  metapathwayType: string | null;

  @ApiProperty({
    description: 'Allocator application audit; null for FilPlus edition 5 data',
    nullable: true,
  })
  applicationAudit: string | null;

  @ApiProperty({
    description: 'Allocator pathway type; null for FilPlus edition 6 data',
    nullable: true,
  })
  pathway: string | null;

  @ApiProperty({
    description: 'Type of allocator; null for FilPlus edition 6 data',
    nullable: true,
  })
  typeOfAllocator: string | null;
}

export class AllocatorAuditTimesByRoundData {
  @ApiProperty({
    description:
      'Average times from audit started time to ended time for each audit round in seconds',
    isArray: true,
    type: Number,
  })
  averageAuditTimesSecs: number[];

  @ApiProperty({
    description:
      'Average times from audit ended time to datacap allocated time for each audit round in seconds; null for FilPlus edition 5 data',
    isArray: true,
    type: Number,
    nullable: true,
  })
  averageAllocationTimesSecs: number[] | null;

  @ApiProperty({
    description:
      'Average conversation time for each audit round in seconds; null for FilPlus edition 6 data',
    isArray: true,
    type: Number,
    nullable: true,
  })
  averageConversationTimesSecs: number[] | null;
}

export class AllocatorAuditTimesByMonthData {
  @ApiProperty({
    description: 'Month of the audit data; YYYY-MM format',
    example: '2024-04',
  })
  month: string;

  @ApiProperty({
    description:
      'Average time from audit started time to ended time for the month in seconds',
  })
  averageAuditTimeSecs: number;

  @ApiProperty({
    description:
      'Average time from audit ended time to datacap allocated time for the month in seconds',
  })
  averageAllocationTimeSecs: number;
}

export enum AllocatorAuditOutcome {
  invalid = 'invalid',
  unknown = 'unknown',
  notAudited = 'notAudited',
  passed = 'passed',
  passedConditionally = 'passedConditionally',
  failed = 'failed',
}

type AllocatorAuditOutcomesMetrics = {
  [K in AllocatorAuditOutcome]?: number;
};

export class AllocatorAuditOutcomesData {
  @ApiProperty({
    description: 'Month of the audit data; YYYY-MM format',
    example: '2024-04',
  })
  month: string;

  @ApiProperty({
    description: 'Datacap amount for each audit outcome in the month in PiB',
    type: 'object',
    example: {
      passed: 50,
      passedConditionally: 100,
    },
    additionalProperties: {
      type: 'number',
      enum: Object.values(AllocatorAuditOutcome),
    },
  })
  datacap: AllocatorAuditOutcomesMetrics;

  @ApiProperty({
    description: 'Number of audits for each audit outcome in the month',
    type: 'object',
    example: {
      passed: 1,
      passedConditionally: 2,
    },
    additionalProperties: {
      type: 'number',
      enum: Object.values(AllocatorAuditOutcome),
    },
  })
  count: AllocatorAuditOutcomesMetrics;
}

export class AllocatorAuditStateAudits {
  @ApiProperty({
    format: 'date-time',
    example: '2024-04-22T00:00:00.000Z',
    description:
      'Timestamp when the audit ended; null for FilPlus edition 5 data; ISO format',
    nullable: true,
  })
  ended: string | null;

  @ApiProperty({
    format: 'date-time',
    example: '2024-04-22T00:00:00.000Z',
    description:
      'Timestamp when the audit started; null for FilPlus edition 5 data; ISO format',
    nullable: true,
  })
  started: string | null;

  @ApiProperty({
    format: 'date-time',
    example: '2024-04-22T00:00:00.000Z',
    description:
      'Timestamp when datacap was allocated; null for FilPlus edition 5 data; ISO format',
    nullable: true,
  })
  dc_allocated: string | null;

  @ApiProperty({
    description: 'Audit outcome',
    enum: AllocatorAuditOutcome,
  })
  outcome: AllocatorAuditOutcome;

  @ApiProperty({
    description: 'Datacap amount allocated in the audit in PiB',
  })
  datacap_amount: number;
}

export class AllocatorAuditStatesData {
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
      'Average storage providers HTTP retrievability success rate in the week',
  })
  averageHttpSuccessRate: number;

  @ApiProperty({
    description:
      'Average storage providers URL Finder retrievability success rate in the week',
  })
  averageUrlFinderSuccessRate: number;

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
      'Last full week average storage providers HTTP retrievability success rate',
  })
  averageHttpSuccessRate: number;

  @ApiProperty({
    description:
      'Last full week average storage providers URL Finder retrievability success rate',
  })
  averageUrlFinderSuccessRate: number;

  @ApiProperty({ type: AllocatorSpsComplianceWeekResults, isArray: true })
  results: AllocatorSpsComplianceWeekResults[];

  constructor(
    metricsChecked: StorageProviderComplianceMetrics,
    averageHttpSuccessRate: number,
    averageUrlFinderSuccessRate: number,
    results: AllocatorSpsComplianceWeekResults[],
  ) {
    this.metricsChecked = metricsChecked;
    this.averageHttpSuccessRate = averageHttpSuccessRate;
    this.averageUrlFinderSuccessRate = averageUrlFinderSuccessRate;
    this.results = results;
  }
}
