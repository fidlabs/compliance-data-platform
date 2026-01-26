-- CreateTable
CREATE TABLE "clients_stats_daily" (
    "date" TIMESTAMP(3) NOT NULL,
    "clients_with_active_deals" INTEGER NOT NULL,
    "clients_who_have_dc_and_deals" INTEGER NOT NULL,
    "total_remaining_clients_datacap" BIGINT NOT NULL,

    CONSTRAINT "clients_stats_daily_pkey" PRIMARY KEY ("date")
);
