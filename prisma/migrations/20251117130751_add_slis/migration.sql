-- CreateEnum
CREATE TYPE "StorageProvidersMetricType" AS ENUM ('TTFB');

-- CreateTable
CREATE TABLE "storage_provider_sli_metric" (
    "id" TEXT NOT NULL,
    "metricType" "StorageProvidersMetricType" NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "unit" TEXT,

    CONSTRAINT "storage_provider_sli_metric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_provider_sli" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "metricId" TEXT NOT NULL,
    "value" BIGINT NOT NULL,
    "update_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "storage_provider_sli_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "storage_provider_sli_metric_metricType_key" ON "storage_provider_sli_metric"("metricType");

-- CreateIndex
CREATE INDEX "storage_provider_sli_providerId_idx" ON "storage_provider_sli"("providerId");

-- CreateIndex
CREATE INDEX "storage_provider_sli_metricId_idx" ON "storage_provider_sli"("metricId");

-- CreateIndex
CREATE INDEX "storage_provider_sli_providerId_metricId_update_date_idx" ON "storage_provider_sli"("providerId", "metricId", "update_date");

-- AddForeignKey
ALTER TABLE "storage_provider_sli" ADD CONSTRAINT "storage_provider_sli_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "storage_provider_sli_metric"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
