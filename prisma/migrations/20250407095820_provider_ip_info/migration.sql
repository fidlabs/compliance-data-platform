-- CreateTable
CREATE TABLE IF NOT EXISTS "provider_ip_info" (
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider" TEXT NOT NULL,
    "lat" TEXT,
    "long" TEXT,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,

    CONSTRAINT "provider_ip_info_pkey" PRIMARY KEY ("provider","date")
);
