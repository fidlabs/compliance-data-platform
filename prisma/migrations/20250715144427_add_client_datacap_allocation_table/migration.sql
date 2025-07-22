-- CreateTable
CREATE TABLE "client_datacap_allocation" (
    "id" INTEGER NOT NULL,
    "client_id" TEXT NOT NULL,
    "allocator_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "allocation" DECIMAL NOT NULL,

    CONSTRAINT "client_datacap_allocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_datacap_allocation_client_id_idx" ON "client_datacap_allocation"("client_id");
