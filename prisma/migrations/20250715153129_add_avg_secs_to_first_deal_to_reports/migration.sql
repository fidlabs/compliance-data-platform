-- AlterTable
ALTER TABLE "allocator_report" ADD COLUMN     "avg_secs_to_first_deal" BIGINT;

-- AlterTable
ALTER TABLE "client_report" ADD COLUMN     "avg_secs_to_first_deal" BIGINT;
