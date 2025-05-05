-- AlterTable
ALTER TABLE "allocator_report_client" ADD COLUMN     "client_contract" BOOLEAN,
ADD COLUMN     "client_contract_max_deviation" TEXT;

-- AlterTable
ALTER TABLE "client_report" ADD COLUMN     "client_contract" BOOLEAN,
ADD COLUMN     "client_contract_max_deviation" TEXT;
