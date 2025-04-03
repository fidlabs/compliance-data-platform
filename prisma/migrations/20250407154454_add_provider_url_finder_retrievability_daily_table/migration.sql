-- CreateTable
CREATE TABLE "provider_url_finder_retrievability_daily" (
    "date" TIMESTAMP(3) NOT NULL,
    "provider" TEXT NOT NULL,
    "success_rate" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "provider_url_finder_retrievability_daily_pkey" PRIMARY KEY ("date","provider")
);
