/*
  Warnings:

  - Added the required column `total_requested_amount` to the `client_report` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total_uniq_data_set_size` to the `client_report` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "ClientReportCheck" ADD VALUE 'UNIQ_DATA_SET_SIZE_TO_DECLARED';

-- AlterTable
ALTER TABLE "client_report" ADD COLUMN     "total_requested_amount" BIGINT NOT NULL,
ADD COLUMN     "total_uniq_data_set_size" BIGINT NOT NULL;
