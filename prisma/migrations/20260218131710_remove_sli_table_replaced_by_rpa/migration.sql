/*
  Warnings:

  - You are about to drop the `storage_provider_sli` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `storage_provider_sli_metric` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "storage_provider_sli" DROP CONSTRAINT "storage_provider_sli_metric_id_fkey";

-- DropTable
DROP TABLE "storage_provider_sli";

-- DropTable
DROP TABLE "storage_provider_sli_metric";

-- DropEnum
DROP TYPE "StorageProviderSliMetricType";
