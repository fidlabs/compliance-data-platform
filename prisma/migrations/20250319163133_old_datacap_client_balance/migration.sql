-- CreateTable
CREATE TABLE "old_datacap_client_balance_nv22" (
    "client" TEXT NOT NULL,
    "old_dc_balance" BIGINT NOT NULL,

    CONSTRAINT "old_datacap_client_balance_nv22_pkey" PRIMARY KEY ("client")
);

-- CreateTable
CREATE TABLE "old_datacap_client_balance_weekly" (
    "week" TIMESTAMP(3) NOT NULL,
    "client" TEXT NOT NULL,
    "old_dc_balance" BIGINT NOT NULL,
    "claims" BIGINT NOT NULL,

    CONSTRAINT "old_datacap_client_balance_weekly_pkey" PRIMARY KEY ("week","client")
);
