/*
  Warnings:

  - You are about to alter the column `total_allocations` on the `compliance_report_client` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,2)` to `BigInt`.

*/
-- AlterTable
ALTER TABLE "compliance_report_client" ALTER COLUMN "total_allocations" SET DATA TYPE BIGINT;
