-- CreateEnum
CREATE TYPE "StorageProvidersMetricType" AS ENUM ('TTFB', 'RPA_RETRIEVABILITY', 'RETENTION');

-- CreateTable
CREATE TABLE "storage_provider_sli_metric" (
    "id" TEXT NOT NULL,
    "metric_type" "StorageProvidersMetricType" NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "unit" TEXT,

    CONSTRAINT "storage_provider_sli_metric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_provider_sli" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "metric_id" TEXT NOT NULL,
    "value" BIGINT NOT NULL,
    "update_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "storage_provider_sli_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "storage_provider_sli_metric_metric_type_key" ON "storage_provider_sli_metric"("metric_type");

-- CreateIndex
CREATE INDEX "storage_provider_sli_provider_id_idx" ON "storage_provider_sli"("provider_id");

-- CreateIndex
CREATE INDEX "storage_provider_sli_metric_id_idx" ON "storage_provider_sli"("metric_id");

-- CreateIndex
CREATE INDEX "storage_provider_sli_provider_id_metric_id_update_date_idx" ON "storage_provider_sli"("provider_id", "metric_id", "update_date");

-- AddForeignKey
ALTER TABLE "storage_provider_sli" ADD CONSTRAINT "storage_provider_sli_metric_id_fkey" FOREIGN KEY ("metric_id") REFERENCES "storage_provider_sli_metric"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
