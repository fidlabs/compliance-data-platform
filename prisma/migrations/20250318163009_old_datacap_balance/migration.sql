-- CreateTable
CREATE TABLE "old_datacap_balance_nv22" (
    "allocator" TEXT NOT NULL,
    "old_dc_balance" BIGINT NOT NULL,

    CONSTRAINT "old_datacap_balance_nv22_pkey" PRIMARY KEY ("allocator")
);

-- CreateTable
CREATE TABLE "old_datacap_balance_weekly" (
    "week" TIMESTAMP(3) NOT NULL,
    "allocator" TEXT NOT NULL,
    "old_dc_balance" BIGINT NOT NULL,

    CONSTRAINT "old_datacap_balance_weekly_pkey" PRIMARY KEY ("week","allocator")
);
