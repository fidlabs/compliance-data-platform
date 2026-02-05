import { ApiPropertyOptional } from '@nestjs/swagger';

export class UrlFinderStorageProviderMetricDataRequest {
  @ApiPropertyOptional({
    description: 'Requested start date to fetch historical metrics',
    format: 'date-time',
    example: '2025-04-22T00:00:00.000Z',
  })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Requested end date to fetch historical metrics',
    format: 'date-time',
    example: '2026-04-22T00:00:00.000Z',
  })
  endDate?: string;
}
