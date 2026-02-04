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
