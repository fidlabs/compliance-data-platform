-- CreateTable
CREATE TABLE "client_address_mapping" (
    "client" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "create_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_address_mapping_pkey" PRIMARY KEY ("client")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_address_mapping_address_key" ON "client_address_mapping"("address");
