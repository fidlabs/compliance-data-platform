/*
  Warnings:

  - You are about to drop the `client_report_approver` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "client_report_approver" DROP CONSTRAINT "client_report_approver_client_report_id_fkey";

-- DropTable
DROP TABLE "client_report_approver";
