-- CreateTable
CREATE TABLE "po_rep_deal_terms" (
    "deal_id" BIGINT NOT NULL,
    "deal_size_bytes" BIGINT NOT NULL,
    "price_per_sector_per_month" BIGINT NOT NULL,
    "duration_days" BIGINT NOT NULL,

    CONSTRAINT "po_rep_deal_terms_pkey" PRIMARY KEY ("deal_id")
);

-- AddForeignKey
ALTER TABLE "po_rep_deal_terms" ADD CONSTRAINT "po_rep_deal_terms_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "po_rep_deal"("dealId") ON DELETE RESTRICT ON UPDATE CASCADE;
