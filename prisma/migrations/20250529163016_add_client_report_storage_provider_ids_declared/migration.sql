-- AlterTable
ALTER TABLE "client_report" ADD COLUMN     "storage_provider_ids_declared" TEXT[] DEFAULT ARRAY[]::TEXT[];
