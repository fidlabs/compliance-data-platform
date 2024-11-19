/*
  Warnings:

  - You are about to drop the column `location` on the `client_report_storage_provider_distribution` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "client_report_storage_provider_distribution" DROP COLUMN "location";

-- CreateTable
CREATE TABLE "client_report_storage_provider_distribution_location" (
    "id" BIGSERIAL NOT NULL,
    "ip" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "loc" TEXT NOT NULL,
    "org" TEXT NOT NULL,
    "postal" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "provider_distribution_id" BIGINT NOT NULL,

    CONSTRAINT "client_report_storage_provider_distribution_location_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_report_storage_provider_distribution_location_provid_key" ON "client_report_storage_provider_distribution_location"("provider_distribution_id");

-- AddForeignKey
ALTER TABLE "client_report_storage_provider_distribution_location" ADD CONSTRAINT "client_report_storage_provider_distribution_location_provi_fkey" FOREIGN KEY ("provider_distribution_id") REFERENCES "client_report_storage_provider_distribution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
