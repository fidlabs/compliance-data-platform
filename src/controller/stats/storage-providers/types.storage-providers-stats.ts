import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  StorageProviderUrlFinderBaseMetricType,
  StorageProviderUrlFinderMetricType,
} from 'src/service/storage-provider-url-finder/types.storage-provider-url-finder.service';

export enum UrlFinderStorageProviderCustomMetricTypeRequest {
  TTFB = 'TTFB',
  BANDWIDTH = 'BANDWIDTH',
  RPA_RETRIEVABILITY = 'RPA_RETRIEVABILITY',
  CONSISTENT_RETRIEVABILITY = 'CONSISTENT_RETRIEVABILITY',
  INCONSISTENT_RETRIEVABILITY = 'INCONSISTENT_RETRIEVABILITY',
}

export class UrlFinderStorageProviderDateRangeRequest {
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

export class UrlFinderStorageProviderBaseMetricRequest extends UrlFinderStorageProviderDateRangeRequest {
  @ApiProperty({
    description: 'Url finder metric type to filter by',
    enum: StorageProviderUrlFinderBaseMetricType,
    example: StorageProviderUrlFinderBaseMetricType.TTFB,
  })
  metricType: StorageProviderUrlFinderBaseMetricType;
}

export class UrlFinderStorageProviderCustomMetricRequest extends UrlFinderStorageProviderDateRangeRequest {
  @ApiProperty({
    description: 'Url finder custom metric type to filter by',
    enum: UrlFinderStorageProviderCustomMetricTypeRequest,
    example: UrlFinderStorageProviderCustomMetricTypeRequest.BANDWIDTH,
  })
  metricType: StorageProviderUrlFinderMetricType;
}
