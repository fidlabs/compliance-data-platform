-- CreateTable
CREATE TABLE "compliance_report_storage_provider_distribution" (
    "id" UUID NOT NULL,
    "compliance_report_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "total_deal_size" BIGINT NOT NULL,
    "unique_data_size" BIGINT NOT NULL,

    CONSTRAINT "compliance_report_storage_provider_distribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_report_storage_provider_distribution_location" (
    "id" UUID NOT NULL,
    "provider_distribution_id" UUID NOT NULL,
    "ip" TEXT NOT NULL, 
    "city" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "loc" TEXT NOT NULL,
    "org" TEXT NOT NULL,
    "postal" TEXT,
    "timezone" TEXT NOT NULL,
    "hostname" TEXT,

    CONSTRAINT "compliance_report_storage_provider_distribution_location_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "compliance_report_storage_provider_distribution_location_pr_key" ON "compliance_report_storage_provider_distribution_location"("provider_distribution_id");

-- AddForeignKey
ALTER TABLE "compliance_report_storage_provider_distribution" ADD CONSTRAINT "compliance_report_storage_provider_distribution_compliance_fkey" FOREIGN KEY ("compliance_report_id") REFERENCES "compliance_report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_report_storage_provider_distribution_location" ADD CONSTRAINT "compliance_report_storage_provider_distribution_location_p_fkey" FOREIGN KEY ("provider_distribution_id") REFERENCES "compliance_report_storage_provider_distribution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
