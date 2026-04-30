-- CreateTable
CREATE TABLE "po_rep_indexer_run" (
    "date" TIMESTAMP(3) NOT NULL,
    "chainId" BIGINT NOT NULL,
    "runner" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "blockStart" BIGINT NOT NULL,
    "blockEnd" BIGINT NOT NULL,
    "eventsCount" INTEGER NOT NULL,

    CONSTRAINT "po_rep_indexer_run_pkey" PRIMARY KEY ("date","chainId","runner","version")
);
