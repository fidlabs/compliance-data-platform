-- CreateEnum
CREATE TYPE "ClientReportCheck" AS ENUM ('STORAGE_PROVIDER_DISTRIBUTION_ALL_LOCATED_IN_THE_SAME_REGION', 'STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_EXCEED_PROVIDER_DEAL', 'STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_EXCEED_MAX_DUPLICATION', 'STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_UNKNOWN_LOCATION', 'STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_RETRIEVABILITY_ZERO', 'STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_RETRIEVABILITY_75');

-- CreateTable
CREATE TABLE "client_report_check_result" (
    "id" UUID NOT NULL,
    "create_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" BOOLEAN,
    "check" "ClientReportCheck" NOT NULL,
    "client_report_id" BIGINT NOT NULL,
    "metadata" JSONB,
    "violating_ids" TEXT[],

    CONSTRAINT "client_report_check_result_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_report_check_result_check_client_report_id_key" ON "client_report_check_result"("check", "client_report_id");

-- AddForeignKey
ALTER TABLE "client_report_check_result" ADD CONSTRAINT "client_report_check_result_client_report_id_fkey" FOREIGN KEY ("client_report_id") REFERENCES "client_report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
