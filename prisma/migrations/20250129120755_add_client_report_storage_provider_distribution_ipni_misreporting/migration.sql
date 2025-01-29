-- AlterTable
ALTER TABLE "client_report_storage_provider_distribution" ADD COLUMN     "claims_count" BIGINT,
ADD COLUMN     "ipni_misreporting" BOOLEAN,
ADD COLUMN     "ipni_reported_claims_count" BIGINT;
