-- AlterTable
ALTER TABLE "allocators_weekly_acc" ALTER COLUMN "avg_weighted_retrievability_success_rate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "providers_weekly" ALTER COLUMN "avg_retrievability_success_rate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "providers_weekly_acc" ALTER COLUMN "avg_retrievability_success_rate" DROP NOT NULL;
