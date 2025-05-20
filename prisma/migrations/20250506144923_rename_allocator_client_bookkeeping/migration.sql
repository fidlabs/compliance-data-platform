-- AlterTable
ALTER TABLE "allocator_client_bookkeeping"
RENAME COLUMN     "allocatorId" TO "allocator_id";

-- AlterTable
ALTER TABLE "allocator_client_bookkeeping"
RENAME COLUMN     "clientId" TO "client_id";

-- AlterTable
ALTER TABLE "allocator_client_bookkeeping"
RENAME COLUMN     "clientAddress" TO "client_address";
