-- CreateTable
CREATE TABLE "allocator_client_stats_daily" (
    "date" TIMESTAMP(3) NOT NULL,
    "allocator_id" TEXT NOT NULL,
    "number_of_clients" INTEGER NOT NULL,
    "returning_clients_percentage" DECIMAL(65,30) NOT NULL,
    "average_seconds_to_first_deal" INTEGER,

    CONSTRAINT "allocator_client_stats_daily_pkey" PRIMARY KEY ("allocator_id","date")
);

-- CreateIndex
CREATE INDEX "allocator_client_stats_daily_date_idx" ON "allocator_client_stats_daily"("date");
