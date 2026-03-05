-- CreateTable
CREATE UNLOGGED TABLE "client_provider_distribution_weekly_acc_sync_source" (
    "week" TIMESTAMP(3) NOT NULL,
    "client" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "total_deal_size" BIGINT NOT NULL,
    "unique_data_size" BIGINT NOT NULL,

    CONSTRAINT "client_provider_distribution_weekly_acc_sync_source_pkey" PRIMARY KEY ("week","client","provider")
);
