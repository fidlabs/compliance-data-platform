-- DropIndex
DROP INDEX "allocator_id_key";

-- CreateTable
CREATE TABLE "provider" (
    "id" TEXT NOT NULL,
    "num_of_deals" INTEGER NOT NULL,
    "total_deal_size" BIGINT NOT NULL,
    "num_of_clients" INTEGER NOT NULL,
    "last_deal_height" INTEGER NOT NULL,

    CONSTRAINT "provider_pkey" PRIMARY KEY ("id")
);
