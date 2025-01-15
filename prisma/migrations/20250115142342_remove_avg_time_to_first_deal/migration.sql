/*
  Warnings:

  - You are about to drop the column `avg_time_to_first_deal` on the `compliance_report` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "compliance_report" DROP COLUMN "avg_time_to_first_deal";
