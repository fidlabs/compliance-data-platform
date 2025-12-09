-- AlterTable
ALTER TABLE "unified_verified_deal_hourly" ADD COLUMN     "num_of_ddo_claims" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_ddo_deal_size" BIGINT NOT NULL DEFAULT 0;
