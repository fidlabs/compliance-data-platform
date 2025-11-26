-- @param {Decimal} $1:minScorePercentage
-- @param {Decimal} $2:maxScorePercentage
-- @param {DateTime} $3:thresholdDate
 WITH "max_range" AS
  (SELECT "scoring_result_id",
          MAX("score") AS "max_score"
   FROM "allocator_report_scoring_result_range"
   GROUP BY "scoring_result_id"),
      "allocator_score" AS
  (SELECT "report"."allocator",
          SUM("scoring_result"."score")::DECIMAL / NULLIF(SUM("range"."max_score"), 0)::DECIMAL AS "score_percentage",
          ROW_NUMBER() OVER (PARTITION BY "report"."allocator"
                             ORDER BY "report"."create_date" DESC) AS "row_index"
   FROM "allocator_report" AS "report"
   LEFT JOIN "allocator_report_scoring_result" AS "scoring_result" ON "report"."id" = "scoring_result"."allocator_report_id"
   LEFT JOIN "max_range" AS range ON "range"."scoring_result_id" = "scoring_result"."id"
   WHERE "report"."create_date" <= $3::DATE
   GROUP BY "report"."allocator",
            "report"."create_date"
   ORDER BY "report"."allocator",
            "report"."create_date" DESC)
SELECT "allocator"
FROM "allocator_score"
WHERE "row_index" = 1
  AND "score_percentage" BETWEEN $1::DECIMAL AND $2::DECIMAL;