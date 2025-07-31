-- AlterTable
ALTER TABLE "allocator_registry" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "program_round" INTEGER;

-- CreateTable
CREATE TABLE "allocator_registry_archive" (
    "allocator_id" TEXT NOT NULL,
    "allocator_address" TEXT NOT NULL,
    "json_path" TEXT NOT NULL,
    "registry_info" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "program_round" INTEGER NOT NULL,

    CONSTRAINT "allocator_registry_archive_pkey" PRIMARY KEY ("allocator_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "allocator_registry_archive_allocator_address_key" ON "allocator_registry_archive"("allocator_address");
