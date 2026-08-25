CREATE INDEX IF NOT EXISTS "client_allocator_distribution_weekly_allocator_week_idx"
ON "client_allocator_distribution_weekly" ("allocator", "week");

CREATE INDEX IF NOT EXISTS "unified_verified_deal_hourly_client_hour_idx"
ON "unified_verified_deal_hourly" ("client", "hour");

CREATE INDEX IF NOT EXISTS "unified_verified_deal_hourly_client_provider_hour_idx"
ON "unified_verified_deal_hourly" ("client", "provider", "hour" DESC);

CREATE INDEX IF NOT EXISTS "client_report_storage_provider_distribution_client_report_i_idx"
ON "client_report_storage_provider_distribution" ("client_report_id");

CREATE INDEX IF NOT EXISTS "client_report_replica_distribution_client_report_id_idx"
ON "client_report_replica_distribution" ("client_report_id");

CREATE INDEX IF NOT EXISTS "allocator_report_allocator_create_date_idx"
ON "allocator_report" ("allocator", "create_date");

CREATE INDEX IF NOT EXISTS "allocator_report_client_replica_distribution_allocator_repo_idx"
ON "allocator_report_client_replica_distribution" ("allocator_report_clientId");

CREATE INDEX IF NOT EXISTS "allocator_report_client_allocation_allocator_report_id_clie_idx"
ON "allocator_report_client_allocation" ("allocator_report_id", "client_id", "timestamp");

CREATE INDEX IF NOT EXISTS "allocator_report_storage_provider_distribution_allocator_re_idx"
ON "allocator_report_storage_provider_distribution" ("allocator_report_id");

CREATE INDEX IF NOT EXISTS "allocator_report_check_result_allocator_report_id_idx"
ON "allocator_report_check_result" ("allocator_report_id");

CREATE INDEX IF NOT EXISTS "allocator_report_check_result_create_date_allocator_report__idx"
ON "allocator_report_check_result" ("create_date", "allocator_report_id");
