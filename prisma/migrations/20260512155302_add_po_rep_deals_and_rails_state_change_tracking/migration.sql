-- AlterTable
ALTER TABLE "filecoin_pay_rail" ADD COLUMN     "activatedAtBlock" BIGINT NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "po_rep_deal_state_change" (
    "deal_id" BIGINT NOT NULL,
    "state" "PoRepDealState" NOT NULL,
    "changed_at_block" BIGINT NOT NULL,

    CONSTRAINT "po_rep_deal_state_change_pkey" PRIMARY KEY ("deal_id","state")
);

-- CreateIndex
CREATE INDEX "po_rep_deal_state_change_deal_id_state_changed_at_block_idx" ON "po_rep_deal_state_change"("deal_id", "state", "changed_at_block" DESC);

-- AddForeignKey
ALTER TABLE "po_rep_deal_state_change" ADD CONSTRAINT "po_rep_deal_state_change_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "po_rep_deal"("dealId") ON DELETE RESTRICT ON UPDATE CASCADE;
