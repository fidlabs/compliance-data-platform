-- AlterTable
ALTER TABLE "allocator_report" ADD COLUMN     "avg_retrievability_success_rate_http" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "allocator_report_storage_provider_distribution" ADD COLUMN     "claims_count" BIGINT,
ADD COLUMN     "ipni_reported_claims_count" BIGINT,
ADD COLUMN     "ipni_reporting_status" "StorageProviderIpniReportingStatus",
ADD COLUMN     "retrievability_success_rate_http" DOUBLE PRECISION;
