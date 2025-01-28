/*
  Warnings:

  - Added the required column `claims_count` to the `client_report_storage_provider_distribution` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ipni_misreporting` to the `client_report_storage_provider_distribution` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "client_report_storage_provider_distribution" ADD COLUMN     "claims_count" BIGINT NOT NULL,
ADD COLUMN     "ipni_misreporting" BOOLEAN NOT NULL,
ADD COLUMN     "ipni_reported_claims_count" BIGINT;
