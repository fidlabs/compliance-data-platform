/*
  Warnings:

  - Added the required column `perc_of_total_datacap` to the `compliance_report_storage_provider_distribution` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "compliance_report_storage_provider_distribution" ADD COLUMN     "perc_of_total_datacap" DOUBLE PRECISION NOT NULL;
