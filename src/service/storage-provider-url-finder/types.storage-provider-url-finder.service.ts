import { ApiProperty } from '@nestjs/swagger';
import {
  StorageProviderUrlFinderMetricResultCodeType,
  StorageProviderUrlFinderMetricType,
} from 'prisma/generated/client';

export type SliStorageProviderMetricData = {
  providerId: string;
  value: number;
  lastUpdateAt: string;
};

export type SliStorageProviderMetricChunkData = SliStorageProviderMetricData & {
  metricType: string;
};

export interface UrlFinderStorageProviderBandwidthData {
  status: string;
  tested_at: string | null;
  ping_avg_ms: number | null;
  head_avg_ms: number | null;
  ttfb_ms: number | null;
  download_speed_mbps: number | null;
}

export interface UrlFinderStorageProviderGeolocationData {
  status: string;
  tested_at: string | null;
  routing_key: string | null;
  region: string | null;
  country: string | null;
  city: string | null;
}

export interface UrlFinderStorageProviderPerformanceData {
  bandwidth: UrlFinderStorageProviderBandwidthData | null;
  geolocation: UrlFinderStorageProviderGeolocationData | null;
}

export interface UrlFinderStorageProviderData {
  provider_id: string;
  client_id: string | null;
  working_url: string | null;
  retrievability_percent: number;
  car_files_percent: number | null;
  tested_at: string;
  performance: UrlFinderStorageProviderPerformanceData;
}

export interface UrlFinderStorageProviderBulkResponse {
  not_found?: string[];
  providers: UrlFinderStorageProviderDataResponse[];
}

export interface UrlFinderStorageProviderDataResponse extends UrlFinderStorageProviderData {
  error: string | null;
  error_code: string | null;
  diagnostics?: {
    result_code: string;
  };
}

export interface StorageProviderUrlFinderMetricValue {
  metricType: StorageProviderUrlFinderMetricType;
  value?: number;
  testedAt?: Date;
}

export interface StorageProviderUrlFinderDailySnapshot {
  provider: string;
  snapshotDate: Date;
  testedAt: Date;
  resultCode: StorageProviderUrlFinderMetricResultCodeType;
  metricValues?: StorageProviderUrlFinderMetricValue[];
}

export class StorageProviderMetricHistogramResult {
  @ApiProperty({
    example: 'TIMEOUT',
  })
  code: string;

  @ApiProperty({
    example: 42,
  })
  count: number;

  @ApiProperty({
    example: 21.5,
    description: 'Percentage of all results for the day',
  })
  percentage: number;

  constructor(code: string, count: number, percentage: number) {
    this.code = code;

    this.count = count;
    this.percentage = percentage;
  }
}

export class StorageProviderMetricHistogramDay {
  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-02-04T00:00:00.000Z',
  })
  day: Date;

  @ApiProperty({
    description: 'Total number of storage providers for the day',
    example: 197,
  })
  total: number;

  @ApiProperty({
    type: StorageProviderMetricHistogramResult,
    isArray: true,
  })
  results: StorageProviderMetricHistogramResult[];

  constructor(
    day: Date,
    total: number,
    results: StorageProviderMetricHistogramResult[],
  ) {
    this.day = day;
    this.total = total;
    this.results = results;
  }
}

export class StorageProviderMetricHistogramDailyResponse {
  @ApiProperty({
    type: Object,
    description: 'Metadata of metric codes to their descriptions and names',
  })
  metadata: {
    [code: string]: {
      name: string;
      description: string;
    };
  };

  @ApiProperty({
    description: 'Total number of storage providers in the whole range',
    example: 1234,
  })
  total: number;

  @ApiProperty({
    type: StorageProviderMetricHistogramDay,
    isArray: true,
  })
  days: StorageProviderMetricHistogramDay[];

  constructor(
    total: number,
    days: StorageProviderMetricHistogramDay[],
    metadata: Record<string, { name: string; description: string }>,
  ) {
    this.total = total;
    this.days = days;
    this.metadata = metadata;
  }
}
