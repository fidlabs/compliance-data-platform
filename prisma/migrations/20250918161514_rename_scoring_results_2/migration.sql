-- AlterTable
ALTER TABLE "allocator_report_scoring_result" RENAME CONSTRAINT "allocator_report_scoring_results_pkey" TO "allocator_report_scoring_result_pkey";

-- RenameForeignKey
ALTER TABLE "allocator_report_scoring_result" RENAME CONSTRAINT "allocator_report_scoring_results_allocator_report_id_fkey" TO "allocator_report_scoring_result_allocator_report_id_fkey";

-- RenameIndex
ALTER INDEX "allocator_report_scoring_results_metric_allocator_report_id_key" RENAME TO "allocator_report_scoring_result_metric_allocator_report_id_key";
