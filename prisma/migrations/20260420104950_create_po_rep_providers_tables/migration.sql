-- CreateTable
CREATE TABLE "po_rep_storage_provider" (
    "providerId" BIGINT NOT NULL,
    "organization" TEXT NOT NULL DEFAULT '0x0000000000000000000000000000000000000000',
    "payee" TEXT NOT NULL DEFAULT '0x0000000000000000000000000000000000000000',
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "availableBytes" BIGINT NOT NULL DEFAULT 0,
    "committedBytes" BIGINT NOT NULL DEFAULT 0,
    "pendingBytes" BIGINT NOT NULL DEFAULT 0,
    "pricePerSectorPerMonth" BIGINT NOT NULL DEFAULT 0,
    "minDealDurationDays" INTEGER NOT NULL DEFAULT 0,
    "maxDealDurationDays" INTEGER NOT NULL DEFAULT 0,
    "registeredAtBlock" BIGINT NOT NULL,

    CONSTRAINT "po_rep_storage_provider_pkey" PRIMARY KEY ("providerId")
);

-- CreateTable
CREATE TABLE "po_rep_storage_provider_capabilities" (
    "providerId" BIGINT NOT NULL,
    "retrievabilityBps" INTEGER NOT NULL DEFAULT 0,
    "bandwidthMbps" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "indexingPct" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "po_rep_storage_provider_capabilities_pkey" PRIMARY KEY ("providerId")
);

-- AddForeignKey
ALTER TABLE "po_rep_storage_provider_capabilities" ADD CONSTRAINT "po_rep_storage_provider_capabilities_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "po_rep_storage_provider"("providerId") ON DELETE RESTRICT ON UPDATE CASCADE;
