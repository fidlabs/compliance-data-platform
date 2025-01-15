/*
  Warnings:

  - You are about to drop the column `filecoin_pulse` on the `compliance_report` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "compliance_report" DROP COLUMN "filecoin_pulse";
