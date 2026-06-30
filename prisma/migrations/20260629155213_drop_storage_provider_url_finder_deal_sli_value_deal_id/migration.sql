/*
  Warnings:

  - You are about to drop the column `deal_id` on the `storage_provider_url_finder_deal_sli_value` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[sli_id,snapshot_id]` on the table `storage_provider_url_finder_deal_sli_value` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "storage_provider_url_finder_deal_sli_value_deal_id_idx";

-- DropIndex
DROP INDEX "storage_provider_url_finder_deal_sli_value_deal_id_sli_id_s_idx";

-- DropIndex
DROP INDEX "storage_provider_url_finder_deal_sli_value_deal_id_sli_id_s_key";

-- AlterTable
ALTER TABLE "storage_provider_url_finder_deal_sli_value" DROP COLUMN "deal_id";

-- CreateIndex
CREATE INDEX "storage_provider_url_finder_deal_sli_value_sli_id_snapshot__idx" ON "storage_provider_url_finder_deal_sli_value"("sli_id", "snapshot_id");

-- CreateIndex
CREATE UNIQUE INDEX "storage_provider_url_finder_deal_sli_value_sli_id_snapshot__key" ON "storage_provider_url_finder_deal_sli_value"("sli_id", "snapshot_id");
