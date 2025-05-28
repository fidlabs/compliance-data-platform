-- AlterEnum
ALTER TYPE "AllocatorReportCheck" ADD VALUE 'NOT_ENOUGH_COPIES';

-- CreateTable
CREATE TABLE "allocator_report_client_replica_distribution" (
    "id" BIGSERIAL NOT NULL,
    "num_of_replicas" BIGINT NOT NULL,
    "total_deal_size" BIGINT NOT NULL,
    "unique_data_size" BIGINT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "allocator_report_clientId" UUID,

    CONSTRAINT "allocator_report_client_replica_distribution_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "allocator_report_client_replica_distribution" ADD CONSTRAINT "allocator_report_client_replica_distribution_allocator_rep_fkey" FOREIGN KEY ("allocator_report_clientId") REFERENCES "allocator_report_client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "allocator_client_bookkeeping_clientId_idx" RENAME TO "allocator_client_bookkeeping_client_id_idx";

-- RenameIndex
ALTER INDEX "allocator_registry_address_key" RENAME TO "allocator_registry_allocator_address_key";
