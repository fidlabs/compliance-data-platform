-- CreateTable
CREATE TABLE "po_rep_deal_manifest_cache" (
    "deal_id" BIGINT NOT NULL,
    "manifest_location" TEXT NOT NULL,
    "manifest_content" JSONB NOT NULL,

    CONSTRAINT "po_rep_deal_manifest_cache_pkey" PRIMARY KEY ("deal_id")
);

-- CreateTable
CREATE TABLE "po_rep_deal_pieces" (
    "deal_id" BIGINT NOT NULL,
    "piece_cid" TEXT NOT NULL,

    CONSTRAINT "po_rep_deal_pieces_pkey" PRIMARY KEY ("deal_id","piece_cid")
);
