export type SliStorageProviderMetricData = {
  providerId: string;
  value: number;
  lastUpdateAt: string;
};

export type SliStorageProviderMetricChunkData = SliStorageProviderMetricData & {
  metricType: string;
};

export interface UrlFinderStorageProviderBandwidthResult {
  status: string;
  tested_at: string | null;
  ping_avg_ms: number | null;
  head_avg_ms: number | null;
  ttfb_ms: number | null;
  download_speed_mbps: number | null;
}

export interface UrlFinderStorageProviderGeolocationResult {
  status: string;
  tested_at: string | null;
  routing_key: string | null;
  region: string | null;
  country: string | null;
  city: string | null;
}

export interface UrlFinderStorageProviderPerformanceData {
  bandwidth: UrlFinderStorageProviderBandwidthResult | null;
  geolocation: UrlFinderStorageProviderGeolocationResult | null;
}

export interface UrlFinderStorageProviderData {
  provider_id: string;
  client_id: string | null;
  working_url: string | null;
  retrievability_percent: number;
  tested_at: string;
  result_code: string;
  performance: UrlFinderStorageProviderPerformanceData;
}

export interface UrlFinderStorageProviderBulkResponse {
  providers: UrlFinderStorageProviderData[];
}
