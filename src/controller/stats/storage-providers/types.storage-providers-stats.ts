import { ApiPropertyOptional } from '@nestjs/swagger';

export enum StorageProviderUrlFinderMetricTypeRequestEnum {
  TTFB = 'TTFB',
  BANDWIDTH = 'BANDWIDTH',
  RPA_RETRIEVABILITY = 'RPA_RETRIEVABILITY',
  CONSISTENT_RETRIEVABILITY = 'CONSISTENT_RETRIEVABILITY',
  INCONSISTENT_RETRIEVABILITY = 'INCONSISTENT_RETRIEVABILITY',
}

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
    enum: StorageProviderUrlFinderMetricTypeRequestEnum,
    example: StorageProviderUrlFinderMetricTypeRequestEnum.TTFB,
  })
  metricType: StorageProviderUrlFinderMetricTypeRequestEnum;
}
