/*
  Warnings:

  - You are about to drop the column `violating_ids` on the `client_report_check_result` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "client_report_check_result" DROP COLUMN "violating_ids";
