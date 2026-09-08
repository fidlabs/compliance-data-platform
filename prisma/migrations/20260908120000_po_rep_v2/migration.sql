TRUNCATE TABLE
    "po_rep_deal_state_change",
    "po_rep_deal_requirements",
    "po_rep_deal_terms",
    "po_rep_deal";

-- AlterEnum
BEGIN;
CREATE TYPE "PoRepDealState_new" AS ENUM ('PROPOSED', 'ACCEPTED', 'ACTIVE', 'FINALIZED', 'REJECTED', 'EXPIRED', 'EARLY_TERMINATED');
ALTER TABLE "po_rep_deal" ALTER COLUMN "state" TYPE "PoRepDealState_new" USING ("state"::text::"PoRepDealState_new");
ALTER TABLE "po_rep_deal_state_change" ALTER COLUMN "state" TYPE "PoRepDealState_new" USING ("state"::text::"PoRepDealState_new");
ALTER TYPE "PoRepDealState" RENAME TO "PoRepDealState_old";
ALTER TYPE "PoRepDealState_new" RENAME TO "PoRepDealState";
DROP TYPE "PoRepDealState_old";
COMMIT;

-- AlterTable
ALTER TABLE "po_rep_deal" ADD COLUMN     "offerId" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "po_rep_deal_requirements" DROP COLUMN "bandwidthMbps",
ADD COLUMN     "bandwidthBytesPerSecond" BIGINT NOT NULL;

-- CreateTable
CREATE TABLE "po_rep_offer" (
    "offerId" BIGINT NOT NULL,
    "providerId" BIGINT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "minSizeBytes" BIGINT NOT NULL,
    "maxSizeBytes" BIGINT NOT NULL,
    "minDurationEpochs" BIGINT NOT NULL,
    "maxDurationEpochs" BIGINT NOT NULL,
    "retrievabilityBps" INTEGER NOT NULL DEFAULT 0,
    "bandwidthBytesPerSecond" BIGINT NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "indexingPct" INTEGER NOT NULL DEFAULT 0,
    "createdAtBlock" BIGINT NOT NULL,

    CONSTRAINT "po_rep_offer_pkey" PRIMARY KEY ("offerId")
);

-- CreateTable
CREATE TABLE "po_rep_offer_payment" (
    "offerId" BIGINT NOT NULL,
    "token" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "pricePer32GiBPerMonth" DECIMAL(78,0) NOT NULL,

    CONSTRAINT "po_rep_offer_payment_pkey" PRIMARY KEY ("offerId","token")
);

-- AddForeignKey
ALTER TABLE "po_rep_offer" ADD CONSTRAINT "po_rep_offer_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "po_rep_storage_provider"("providerId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "po_rep_offer_payment" ADD CONSTRAINT "po_rep_offer_payment_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "po_rep_offer"("offerId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "po_rep_deal" ADD CONSTRAINT "po_rep_deal_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "po_rep_offer"("offerId") ON DELETE RESTRICT ON UPDATE CASCADE;

