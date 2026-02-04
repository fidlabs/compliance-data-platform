/*
  Warnings:

  - Changed the type of `metric_type` on the `storage_provider_sli_metric` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "StorageProviderSliMetricType" AS ENUM ('TTFB', 'RPA_RETRIEVABILITY', 'RETENTION', 'BANDWIDTH');

-- CreateEnum
CREATE TYPE "StorageProviderUrlFinderMetricType" AS ENUM ('TTFB', 'RPA_RETRIEVABILITY', 'BANDWIDTH');

-- CreateEnum
CREATE TYPE "StorageProviderUrlFinderMetricResultCodeType" AS ENUM ('NO_PEER_ID', 'NO_CID_CONTACT_DATA', 'MISSING_ADDR_FROM_CID_CONTACT', 'MISSING_HTTP_ADDR_FROM_CID_CONTACT', 'FAILED_TO_GET_WORKING_URL', 'NO_DEALS_FOUND', 'TIMED_OUT', 'ERROR', 'SUCCESS');

-- AlterTable
ALTER TABLE "storage_provider_sli_metric" DROP COLUMN "metric_type",
ADD COLUMN     "metric_type" "StorageProviderSliMetricType" NOT NULL;

-- DropEnum
DROP TYPE "StorageProvidersMetricType";

-- CreateTable
CREATE TABLE "storage_provider_url_finder_metric" (
    "id" TEXT NOT NULL,
    "metric_type" "StorageProviderUrlFinderMetricType" NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "unit" TEXT,

    CONSTRAINT "storage_provider_url_finder_metric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_provider_url_finder_metric_value" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "metric_id" TEXT NOT NULL,
    "snapshot_id" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "tested_at" TIMESTAMP(3),

    CONSTRAINT "storage_provider_url_finder_metric_value_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_provider_url_finder_daily_snapshot" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "snapshot_date" TIMESTAMP(3) NOT NULL,
    "tested_at" TIMESTAMP(3) NOT NULL,
    "result_code" "StorageProviderUrlFinderMetricResultCodeType" NOT NULL,

    CONSTRAINT "storage_provider_url_finder_daily_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "storage_provider_url_finder_metric_metric_type_key" ON "storage_provider_url_finder_metric"("metric_type");

-- CreateIndex
CREATE INDEX "storage_provider_url_finder_metric_value_provider_idx" ON "storage_provider_url_finder_metric_value"("provider");

-- CreateIndex
CREATE INDEX "storage_provider_url_finder_metric_value_metric_id_idx" ON "storage_provider_url_finder_metric_value"("metric_id");

-- CreateIndex
CREATE INDEX "storage_provider_url_finder_metric_value_provider_metric_id_idx" ON "storage_provider_url_finder_metric_value"("provider", "metric_id", "tested_at");

-- CreateIndex
CREATE UNIQUE INDEX "storage_provider_url_finder_metric_value_provider_metric_id_key" ON "storage_provider_url_finder_metric_value"("provider", "metric_id", "tested_at");

-- CreateIndex
CREATE INDEX "storage_provider_url_finder_daily_snapshot_provider_idx" ON "storage_provider_url_finder_daily_snapshot"("provider");

-- CreateIndex
CREATE INDEX "storage_provider_url_finder_daily_snapshot_snapshot_date_idx" ON "storage_provider_url_finder_daily_snapshot"("snapshot_date");

-- CreateIndex
CREATE UNIQUE INDEX "storage_provider_url_finder_daily_snapshot_provider_snapsho_key" ON "storage_provider_url_finder_daily_snapshot"("provider", "snapshot_date");

-- CreateIndex
CREATE UNIQUE INDEX "storage_provider_sli_metric_metric_type_key" ON "storage_provider_sli_metric"("metric_type");

-- AddForeignKey
ALTER TABLE "storage_provider_url_finder_metric_value" ADD CONSTRAINT "storage_provider_url_finder_metric_value_metric_id_fkey" FOREIGN KEY ("metric_id") REFERENCES "storage_provider_url_finder_metric"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_provider_url_finder_metric_value" ADD CONSTRAINT "storage_provider_url_finder_metric_value_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "storage_provider_url_finder_daily_snapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
