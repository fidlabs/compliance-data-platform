-- CreateEnum
CREATE TYPE "AllocatorScoringMetric" AS ENUM ('IPNI_REPORTING', 'HTTP_RETRIEVABILITY', 'URL_FINDER_RETRIEVABILITY', 'CID_SHARING', 'DUPLICATED_DATA', 'UNIQUE_DATA_SET_SIZE', 'EQUALITY_OF_DATACAP_DISTRIBUTION', 'CLIENT_DIVERSITY', 'CLIENT_PREVIOUS_APPLICATIONS');

-- CreateTable
CREATE TABLE "allocator_report_scoring_results" (
    "id" UUID NOT NULL,
    "create_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" INTEGER NOT NULL,
    "metric" "AllocatorScoringMetric" NOT NULL,
    "metric_name" TEXT NOT NULL,
    "metric_description" TEXT NOT NULL,
    "metric_value" DOUBLE PRECISION NOT NULL,
    "metric_average" DOUBLE PRECISION NOT NULL,
    "metric_value_min" DOUBLE PRECISION NOT NULL,
    "metric_value_max" DOUBLE PRECISION,
    "allocator_report_id" UUID NOT NULL,
    "metadata" TEXT[],

    CONSTRAINT "allocator_report_scoring_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "allocator_report_scoring_results_metric_allocator_report_id_key" ON "allocator_report_scoring_results"("metric", "allocator_report_id");

-- AddForeignKey
ALTER TABLE "allocator_report_scoring_results" ADD CONSTRAINT "allocator_report_scoring_results_allocator_report_id_fkey" FOREIGN KEY ("allocator_report_id") REFERENCES "allocator_report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
