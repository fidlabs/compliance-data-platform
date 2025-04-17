-- CreateTable
CREATE TABLE "allocator_registry" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "json_path" TEXT NOT NULL,
    "registry_info" JSONB NOT NULL,

    CONSTRAINT "allocator_registry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "allocator_registry_address_key" ON "allocator_registry"("address");
