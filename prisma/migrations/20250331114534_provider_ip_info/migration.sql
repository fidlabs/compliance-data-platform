-- CreateTable
CREATE TABLE "provider_ip_info" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider" TEXT NOT NULL,
    "lat" TEXT NOT NULL,
    "long" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "city" TEXT NOT NULL,

    CONSTRAINT "provider_ip_info_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "provider_ip_info_provider_date_idx" ON "provider_ip_info"("provider", "date");
