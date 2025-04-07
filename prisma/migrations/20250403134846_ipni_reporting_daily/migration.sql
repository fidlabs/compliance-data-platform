-- CreateTable
CREATE TABLE "ipni_reporting_daily" (
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ok" INTEGER NOT NULL,
    "not_reporting" INTEGER NOT NULL,
    "misreporting" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,

    CONSTRAINT "ipni_reporting_daily_pkey" PRIMARY KEY ("date")
);
