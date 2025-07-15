-- AlterEnum
ALTER TYPE "ClientReportCheck" ADD VALUE 'UNIQ_DATA_SET_SIZE_TO_DECLARED';

-- CreateTable
CREATE TABLE "client_report_uniq_data_set_size" (
    "id" BIGSERIAL NOT NULL,
    "client_report_id" BIGINT NOT NULL,
    "total_requested_amount" BIGINT NOT NULL,
    "total_uniq_data_set_size" BIGINT NOT NULL,

    CONSTRAINT "client_report_uniq_data_set_size_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "client_report_uniq_data_set_size" ADD CONSTRAINT "client_report_uniq_data_set_size_client_report_id_fkey" FOREIGN KEY ("client_report_id") REFERENCES "client_report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
