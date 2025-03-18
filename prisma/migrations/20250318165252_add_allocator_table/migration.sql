-- CreateTable
CREATE TABLE "allocator" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "is_virtual" BOOLEAN NOT NULL,
    "is_metaallocator" BOOLEAN NOT NULL,

    CONSTRAINT "allocator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "allocator_id_key" ON "allocator"("id");

-- CreateIndex
CREATE UNIQUE INDEX "allocator_address_key" ON "allocator"("address");
