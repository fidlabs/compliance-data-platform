-- CreateEnum
CREATE TYPE "PoRepDealState" AS ENUM ('PROPOSED', 'ACCEPTED', 'COMPLETED', 'REJECTED', 'TERMINATED');

-- CreateTable
CREATE TABLE "po_rep_deal" (
    "dealId" BIGINT NOT NULL,
    "providerId" BIGINT NOT NULL,
    "client" TEXT NOT NULL,
    "state" "PoRepDealState" NOT NULL,
    "manifestLocation" TEXT NOT NULL,
    "totalDealSize" BIGINT NOT NULL,
    "proposedAtBlock" BIGINT NOT NULL,
    "railId" BIGINT,

    CONSTRAINT "po_rep_deal_pkey" PRIMARY KEY ("dealId")
);

-- CreateTable
CREATE TABLE "po_rep_deal_requirements" (
    "dealId" BIGINT NOT NULL,
    "retrievabilityBps" INTEGER NOT NULL,
    "bandwidthMbps" INTEGER NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "indexingPct" INTEGER NOT NULL,

    CONSTRAINT "po_rep_deal_requirements_pkey" PRIMARY KEY ("dealId")
);

-- AddForeignKey
ALTER TABLE "po_rep_deal" ADD CONSTRAINT "po_rep_deal_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "po_rep_storage_provider"("providerId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "po_rep_deal_requirements" ADD CONSTRAINT "po_rep_deal_requirements_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "po_rep_deal"("dealId") ON DELETE RESTRICT ON UPDATE CASCADE;
