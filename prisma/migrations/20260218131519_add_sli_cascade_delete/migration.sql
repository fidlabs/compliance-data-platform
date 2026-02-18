-- DropForeignKey
ALTER TABLE "storage_provider_sli" DROP CONSTRAINT "storage_provider_sli_metric_id_fkey";

-- AddForeignKey
ALTER TABLE "storage_provider_sli" ADD CONSTRAINT "storage_provider_sli_metric_id_fkey" FOREIGN KEY ("metric_id") REFERENCES "storage_provider_sli_metric"("id") ON DELETE CASCADE ON UPDATE CASCADE;
