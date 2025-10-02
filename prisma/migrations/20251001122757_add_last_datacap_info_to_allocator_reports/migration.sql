-- AlterTable
ALTER TABLE "allocator_report_client" ADD COLUMN     "last_datacap_received" TIMESTAMP(3),
ADD COLUMN     "last_datacap_spent" TIMESTAMP(3);
