/*
  Warnings:

  - You are about to drop the column `tested_at` on the `storage_provider_url_finder_deal_sli_value` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[deal_id,sli_id,snapshot_id]` on the table `storage_provider_url_finder_deal_sli_value` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "storage_provider_url_finder_deal_sli_value_deal_id_sli_id_t_idx";

-- DropIndex
DROP INDEX "storage_provider_url_finder_deal_sli_value_deal_id_sli_id_t_key";

-- AlterTable
ALTER TABLE "storage_provider_url_finder_deal_sli_value" DROP COLUMN "tested_at";

-- CreateIndex
CREATE INDEX "storage_provider_url_finder_deal_sli_value_deal_id_sli_id_s_idx" ON "storage_provider_url_finder_deal_sli_value"("deal_id", "sli_id", "snapshot_id");

-- CreateIndex
CREATE UNIQUE INDEX "storage_provider_url_finder_deal_sli_value_deal_id_sli_id_s_key" ON "storage_provider_url_finder_deal_sli_value"("deal_id", "sli_id", "snapshot_id");
