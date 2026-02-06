import { ApiPropertyOptional } from '@nestjs/swagger';
import { StorageProviderUrlFinderMetricType } from 'prisma/generated/client';

export class UrlFinderStorageProviderMetricBaseRequest {
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

export class UrlFinderStorageProviderMetricTypeRequest extends UrlFinderStorageProviderMetricBaseRequest {
  @ApiPropertyOptional({
    description: 'Compliance score to filter by',
    enum: StorageProviderUrlFinderMetricType,
    example: StorageProviderUrlFinderMetricType.RPA_RETRIEVABILITY,
  })
  metricType: StorageProviderUrlFinderMetricType;
}
