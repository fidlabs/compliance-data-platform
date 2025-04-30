-- CreateTable
CREATE TABLE "allocator_client_bookkeeping" (
    "allocatorId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientAddress" TEXT NOT NULL,
    "json_path" TEXT NOT NULL,
    "bookkeeping_info" JSONB NOT NULL,

    CONSTRAINT "allocator_client_bookkeeping_pkey" PRIMARY KEY ("allocatorId","clientId")
);

-- CreateIndex
CREATE INDEX "allocator_client_bookkeeping_clientId_idx" ON "allocator_client_bookkeeping"("clientId");
