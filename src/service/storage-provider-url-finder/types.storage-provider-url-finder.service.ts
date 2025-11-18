export type SliStorageProviderMetricData = {
  providerId: string;
  value: number;
  lastUpdateAt: Date;
};

export type SliStorageProviderUrlFinderResponse = {
  provider_id: string;
  client_id: string;
  result_type: string;

  working_url: string | null;
  retrievability_percent: number | null;

  result_code: number;
  error_code: number | null;

  tested_at: number;
};
