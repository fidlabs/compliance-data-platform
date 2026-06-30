-- CreateEnum
CREATE TYPE "StorageProviderUrlFinderDealSLIType" AS ENUM ('RETRIEVABILITY_BPS', 'BANDWIDTH_MBPS', 'LATENCY_MS', 'INDEXING_PCT');

-- CreateTable
CREATE TABLE "storage_provider_url_finder_deal_sli" (
    "id" TEXT NOT NULL,
    "sli_type" "StorageProviderUrlFinderDealSLIType" NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "unit" TEXT,

    CONSTRAINT "storage_provider_url_finder_deal_sli_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_provider_url_finder_deal_sli_value" (
    "id" TEXT NOT NULL,
    "deal_id" BIGINT NOT NULL,
    "sli_id" TEXT NOT NULL,
    "snapshot_id" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "tested_at" TIMESTAMP(3),

    CONSTRAINT "storage_provider_url_finder_deal_sli_value_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_provider_url_finder_deal_daily_snapshot" (
    "id" TEXT NOT NULL,
    "deal_id" BIGINT NOT NULL,
    "snapshot_date" TIMESTAMP(3) NOT NULL,
    "tested_at" TIMESTAMP(3) NOT NULL,
    "result_code" "StorageProviderUrlFinderMetricResultCodeType" NOT NULL,

    CONSTRAINT "storage_provider_url_finder_deal_daily_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "storage_provider_url_finder_deal_sli_sli_type_key" ON "storage_provider_url_finder_deal_sli"("sli_type");

-- CreateIndex
CREATE INDEX "storage_provider_url_finder_deal_sli_value_deal_id_idx" ON "storage_provider_url_finder_deal_sli_value"("deal_id");

-- CreateIndex
CREATE INDEX "storage_provider_url_finder_deal_sli_value_sli_id_idx" ON "storage_provider_url_finder_deal_sli_value"("sli_id");

-- CreateIndex
CREATE INDEX "storage_provider_url_finder_deal_sli_value_deal_id_sli_id_t_idx" ON "storage_provider_url_finder_deal_sli_value"("deal_id", "sli_id", "tested_at");

-- CreateIndex
CREATE UNIQUE INDEX "storage_provider_url_finder_deal_sli_value_deal_id_sli_id_t_key" ON "storage_provider_url_finder_deal_sli_value"("deal_id", "sli_id", "tested_at");

-- CreateIndex
CREATE INDEX "storage_provider_url_finder_deal_daily_snapshot_deal_id_idx" ON "storage_provider_url_finder_deal_daily_snapshot"("deal_id");

-- CreateIndex
CREATE INDEX "storage_provider_url_finder_deal_daily_snapshot_snapshot_da_idx" ON "storage_provider_url_finder_deal_daily_snapshot"("snapshot_date");

-- CreateIndex
CREATE UNIQUE INDEX "storage_provider_url_finder_deal_daily_snapshot_deal_id_sna_key" ON "storage_provider_url_finder_deal_daily_snapshot"("deal_id", "snapshot_date");

-- AddForeignKey
ALTER TABLE "storage_provider_url_finder_deal_sli_value" ADD CONSTRAINT "storage_provider_url_finder_deal_sli_value_sli_id_fkey" FOREIGN KEY ("sli_id") REFERENCES "storage_provider_url_finder_deal_sli"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_provider_url_finder_deal_sli_value" ADD CONSTRAINT "storage_provider_url_finder_deal_sli_value_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "storage_provider_url_finder_deal_daily_snapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
