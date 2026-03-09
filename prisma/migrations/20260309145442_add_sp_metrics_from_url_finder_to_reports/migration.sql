-- AlterTable
ALTER TABLE "client_report_storage_provider_distribution" ADD COLUMN     "bandwidth" DOUBLE PRECISION,
ADD COLUMN     "consistent_retrievability" DOUBLE PRECISION,
ADD COLUMN     "inconsistent_retrievability" DOUBLE PRECISION,
ADD COLUMN     "ttfb" DOUBLE PRECISION;
