-- AlterTable
ALTER TABLE "allocator_report_client" ADD COLUMN     "allocators" TEXT[] DEFAULT ARRAY[]::TEXT[];
