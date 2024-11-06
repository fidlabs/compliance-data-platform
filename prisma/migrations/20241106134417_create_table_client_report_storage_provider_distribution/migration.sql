-- CreateTable
CREATE TABLE "client_report_storage_provider_distribution" (
    "id" BIGSERIAL NOT NULL,
    "client_report_id" BIGINT NOT NULL,
    "provider" TEXT NOT NULL,
    "total_deal_size" BIGINT NOT NULL,
    "unique_data_size" BIGINT NOT NULL,
    "location" JSONB,

    CONSTRAINT "client_report_storage_provider_distribution_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "client_report_storage_provider_distribution" ADD CONSTRAINT "client_report_storage_provider_distribution_client_report__fkey" FOREIGN KEY ("client_report_id") REFERENCES "client_report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
