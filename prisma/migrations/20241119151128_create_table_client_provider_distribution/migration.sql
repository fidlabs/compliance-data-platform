-- CreateTable
CREATE TABLE "client_provider_distribution" (
    "client" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "total_deal_size" BIGINT NOT NULL,
    "unique_data_size" BIGINT NOT NULL,

    CONSTRAINT "client_provider_distribution_pkey" PRIMARY KEY ("client","provider")
);
