-- AlterEnum
ALTER TYPE "ClientReportCheck" ADD VALUE 'UNIQ_DATA_SET_SIZE_TO_DECLARED';

-- AlterTable
ALTER TABLE "client_report" ADD COLUMN     "total_requested_amount" BIGINT,
ADD COLUMN     "total_uniq_data_set_size" BIGINT;
