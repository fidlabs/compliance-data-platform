import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AllocatorReportCheck } from 'prisma/generated/client';

export class ReportChecksCount {
  @ApiProperty({
    description: 'Number of unique report checks passed',
  })
  checksPassedCount: number;

  @ApiProperty({
    description: 'Number of unique report checks failed',
  })
  checksFailedCount: number;
}

export class ReportChecksWeek extends ReportChecksCount {
  @ApiProperty({
    type: String,
    format: 'date',
    example: '2024-04-22T00:00:00.000Z',
    description: 'ISO format',
  })
  week: Date;
}

export class ReportChecksDay extends ReportChecksCount {
  @ApiProperty({
    type: String,
    format: 'date',
    example: '2024-04-22T00:00:00.000Z',
    description: 'ISO format',
  })
  day: Date;
}

export class ReportCheck {
  @ApiProperty({ description: 'Check message' })
  checkMsg: string;

  @ApiProperty({
    description: 'Report ID where the check was generated',
  })
  reportId: string;

  @ApiProperty({
    description: 'Check type',
    enum: AllocatorReportCheck,
  })
  check: AllocatorReportCheck;
}

export class AllocatorReportChecksDetails extends ReportChecksCount {
  @ApiProperty({ description: 'Allocator ID' })
  allocatorId: string;

  @ApiProperty({
    description: 'List of failed report checks',
    type: ReportCheck,
    isArray: true,
  })
  failedChecks: ReportCheck[];
}

export class GetAllocatorReportChecksDailyRequest {
  @ApiPropertyOptional({
    description: 'Requested week; ISO format; default is last week',
    format: 'date',
    example: '2024-04-22T00:00:00.000Z',
  })
  week?: string;
}

export class GetAllocatorReportChecksDailyResponse {
  @ApiProperty({
    format: 'date',
    example: '2024-04-22T00:00:00.000Z',
    description: 'Requested week; ISO format',
  })
  week: string;

  @ApiProperty({
    description: 'Allocator report checks daily',
    type: ReportChecksDay,
    isArray: true,
  })
  results: ReportChecksDay[];
}

export class GetAllocatorReportChecksDetailsRequest {
  @ApiPropertyOptional({
    description: 'Requested day; ISO format; default is yesterday',
    format: 'date',
    example: '2024-04-22T00:00:00.000Z',
  })
  day?: string;
}

export class GetAllocatorReportChecksDetailsResponse {
  @ApiProperty({
    format: 'date',
    example: '2024-04-22T00:00:00.000Z',
    description: 'Requested day; ISO format',
  })
  day: string;

  @ApiProperty({
    description: 'Allocator report checks details',
    type: AllocatorReportChecksDetails,
    isArray: true,
  })
  results: AllocatorReportChecksDetails[];
}
