-- CreateTable
CREATE TABLE "client_report_storage_provider_distribution_retrievability" (
    "id" BIGSERIAL NOT NULL,
    "provider_distribution_id" BIGINT NOT NULL,
    "success_rate" DOUBLE PRECISION,

    CONSTRAINT "client_report_storage_provider_distribution_retrievability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_report_storage_provider_distribution_retrievability__key" ON "client_report_storage_provider_distribution_retrievability"("provider_distribution_id");

-- AddForeignKey
ALTER TABLE "client_report_storage_provider_distribution_retrievability" ADD CONSTRAINT "client_report_storage_provider_distribution_retrievability_fkey" FOREIGN KEY ("provider_distribution_id") REFERENCES "client_report_storage_provider_distribution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
