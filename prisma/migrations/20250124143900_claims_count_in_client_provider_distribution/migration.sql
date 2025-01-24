-- AlterTable
ALTER TABLE "client_provider_distribution" ADD COLUMN     "claims_count" BIGINT;

-- CreateIndex
CREATE INDEX "client_provider_distribution_provider_idx" ON "client_provider_distribution"("provider");
