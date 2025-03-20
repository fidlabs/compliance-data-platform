-- AlterTable
ALTER TABLE "client_report" ADD COLUMN     "allocators" TEXT[] DEFAULT ARRAY[]::TEXT[];
