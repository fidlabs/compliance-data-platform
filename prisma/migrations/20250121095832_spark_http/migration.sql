/*
  Warnings:

  - You are about to drop the column `retrievability_success_rate` on the `client_report_storage_provider_distribution` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "allocators_weekly" ADD COLUMN     "avg_weighted_retrievability_success_rate_http" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "allocators_weekly_acc" ADD COLUMN     "avg_weighted_retrievability_success_rate_http" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "client_report_storage_provider_distribution" DROP COLUMN "retrievability_success_rate",
ADD COLUMN     "retrievability_success_rate_http" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "provider_retrievability_daily" ADD COLUMN     "success_rate_http" DOUBLE PRECISION,
ADD COLUMN     "successful_http" INTEGER;

-- AlterTable
ALTER TABLE "providers_weekly" ADD COLUMN     "avg_retrievability_success_rate_http" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "providers_weekly_acc" ADD COLUMN     "avg_retrievability_success_rate_http" DOUBLE PRECISION;
