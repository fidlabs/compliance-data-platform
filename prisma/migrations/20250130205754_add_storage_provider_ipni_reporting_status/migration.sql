/*
  Warnings:

  - You are about to drop the column `ipni_misreporting` on the `client_report_storage_provider_distribution` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "StorageProviderIpniReportingStatus" AS ENUM ('MISREPORTING', 'NOT_REPORTING', 'OK');

-- AlterTable
ALTER TABLE "client_report_storage_provider_distribution" DROP COLUMN "ipni_misreporting",
ADD COLUMN     "ipni_reporting_status" "StorageProviderIpniReportingStatus";
