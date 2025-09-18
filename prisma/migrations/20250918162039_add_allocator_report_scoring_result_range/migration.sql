-- CreateTable
CREATE TABLE "allocator_report_scoring_result_range" (
    "id" UUID NOT NULL,
    "scoring_result_id" UUID NOT NULL,
    "metric" "AllocatorScoringMetric" NOT NULL,
    "metric_value_min" DOUBLE PRECISION,
    "metric_value_max" DOUBLE PRECISION,
    "score" INTEGER NOT NULL,

    CONSTRAINT "allocator_report_scoring_result_range_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "allocator_report_scoring_result_range" ADD CONSTRAINT "allocator_report_scoring_result_range_scoring_result_id_fkey" FOREIGN KEY ("scoring_result_id") REFERENCES "allocator_report_scoring_result"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
