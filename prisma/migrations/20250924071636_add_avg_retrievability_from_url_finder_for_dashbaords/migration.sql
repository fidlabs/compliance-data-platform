-- AlterTable
ALTER TABLE "allocators_weekly_acc" ADD COLUMN     "avg_weighted_retrievability_success_rate_url_finder" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "providers_weekly" ADD COLUMN     "avg_retrievability_success_rate_url_finder" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "providers_weekly_acc" ADD COLUMN     "avg_retrievability_success_rate_url_finder" DOUBLE PRECISION;
