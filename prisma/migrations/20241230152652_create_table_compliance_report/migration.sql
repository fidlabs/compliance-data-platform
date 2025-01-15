-- CreateTable
CREATE TABLE "allocator_report" (
    "id" UUID NOT NULL,
    "create_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "allocator" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "filecoin_pulse" TEXT NOT NULL,
    "clients_number" INTEGER,
    "multisig" BOOLEAN NOT NULL,
    "avg_retrievability_success_rate" DECIMAL(5,2),
    "avg_time_to_first_deal" DECIMAL(5,2),

    CONSTRAINT "allocator_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allocator_report_client" (
    "id" UUID NOT NULL,
    "allocator_report_id" UUID NOT NULL,
    "client_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "allocations_number" INTEGER NOT NULL,
    "total_allocations" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "allocator_report_client_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "allocator_report_client" ADD CONSTRAINT "allocator_report_client_allocator_report_id_fkey" FOREIGN KEY ("allocator_report_id") REFERENCES "allocator_report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to alter the column `total_allocations` on the `allocator_report_client` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,2)` to `BigInt`.

*/
-- AlterTable
ALTER TABLE "allocator_report_client" ALTER COLUMN "total_allocations" SET DATA TYPE BIGINT;

-- CreateTable
CREATE TABLE "allocator_report_client_allocation" (
    "id" UUID NOT NULL,
    "allocator_report_id" UUID NOT NULL,
    "client_id" TEXT NOT NULL,
    "first_allocation" BIGINT,
    "second_allocation" BIGINT,
    "third_allocation" BIGINT,
    "remaining_allocation" BIGINT,

    CONSTRAINT "allocator_report_client_allocation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "allocator_report_client_allocation" ADD CONSTRAINT "allocator_report_client_allocation_allocator_report_id_fkey" FOREIGN KEY ("allocator_report_id") REFERENCES "allocator_report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "allocator_report_client_allocation" DROP COLUMN "first_allocation",
DROP COLUMN "remaining_allocation",
DROP COLUMN "second_allocation",
DROP COLUMN "third_allocation",
ADD COLUMN     "allocation" BIGINT NOT NULL,
ADD COLUMN     "timestamp" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "allocator_report" ALTER COLUMN "name" DROP NOT NULL;

-- AlterTable
ALTER TABLE "allocator_report_client" ALTER COLUMN "name" DROP NOT NULL;

-- CreateTable
CREATE TABLE "allocator_report_storage_provider_distribution" (
    "id" UUID NOT NULL,
    "allocator_report_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "total_deal_size" BIGINT NOT NULL,
    "unique_data_size" BIGINT NOT NULL,

    CONSTRAINT "allocator_report_storage_provider_distribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allocator_report_storage_provider_distribution_location" (
    "id" UUID NOT NULL,
    "provider_distribution_id" UUID NOT NULL,
    "ip" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "loc" TEXT NOT NULL,
    "org" TEXT NOT NULL,
    "postal" TEXT,
    "timezone" TEXT NOT NULL,
    "hostname" TEXT,

    CONSTRAINT "allocator_report_storage_provider_distribution_location_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "allocator_report_storage_provider_distribution_location_pr_key" ON "allocator_report_storage_provider_distribution_location"("provider_distribution_id");

-- AddForeignKey
ALTER TABLE "allocator_report_storage_provider_distribution" ADD CONSTRAINT "allocator_report_storage_provider_distribution_id_fkey" FOREIGN KEY ("allocator_report_id") REFERENCES "allocator_report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocator_report_storage_provider_distribution_location" ADD CONSTRAINT "allocator_report_storage_provider_distribution_location_p_fkey" FOREIGN KEY ("provider_distribution_id") REFERENCES "allocator_report_storage_provider_distribution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "allocator_report_storage_provider_distribution_location" ALTER COLUMN "org" DROP NOT NULL;

-- AlterTable
ALTER TABLE "allocator_report_storage_provider_distribution" ADD COLUMN     "retrievability_success_rate" DOUBLE PRECISION;

/*
  Warnings:

  - Added the required column `perc_of_total_datacap` to the `allocator_report_storage_provider_distribution` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "allocator_report_storage_provider_distribution" ADD COLUMN     "perc_of_total_datacap" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "allocator_report" ALTER COLUMN "clients_number" SET NOT NULL,
ALTER COLUMN "avg_retrievability_success_rate" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "allocator_report_client" ADD COLUMN     "application_url" TEXT;

-- AlterTable
ALTER TABLE "allocator_report_client" ADD COLUMN     "application_timestamp" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "allocator_report" ALTER COLUMN "avg_time_to_first_deal" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "allocator_report" ADD COLUMN     "data_types" TEXT[],
ADD COLUMN     "required_copies" TEXT,
ADD COLUMN     "required_sps" TEXT;

/*
  Warnings:

  - You are about to drop the column `avg_time_to_first_deal` on the `allocator_report` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "allocator_report" DROP COLUMN "avg_time_to_first_deal";

/*
  Warnings:

  - You are about to drop the column `filecoin_pulse` on the `allocator_report` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "allocator_report" DROP COLUMN "filecoin_pulse";

-- RenameForeignKey
ALTER TABLE "allocator_report_storage_provider_distribution" RENAME CONSTRAINT "allocator_report_storage_provider_distribution_id_fkey" TO "allocator_report_storage_provider_distribution_allocator_r_fkey";

-- RenameForeignKey
ALTER TABLE "allocator_report_storage_provider_distribution_location" RENAME CONSTRAINT "allocator_report_storage_provider_distribution_location_p_fkey" TO "allocator_report_storage_provider_distribution_location_pr_fkey";

-- RenameIndex
ALTER INDEX "allocator_report_storage_provider_distribution_location_pr_key" RENAME TO "allocator_report_storage_provider_distribution_location_pro_key";
