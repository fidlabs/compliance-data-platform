-- @param {DateTime} $1:day Date for which report checks will be counted
-- @param {Boolean} $2:check_result? Check result, optional, leave empty to count both failed and passed checks
 WITH check_per_allocator AS
  (SELECT DISTINCT ON ("report"."allocator") COUNT("check"."id") as "checks_count"
   FROM "allocator_report" as "report"
   JOIN "allocator_report_check_result" AS "check" ON "check"."allocator_report_id" = "report"."id"
   WHERE "check"."create_date" BETWEEN SYMMETRIC date_trunc('day', $1::DATE) AND date_trunc('day', $1::DATE) + '1 day'::INTERVAL
     AND ($2::BOOLEAN IS NULL
          OR "check"."result" = $2::BOOLEAN)
   GROUP BY "report"."allocator",
            "report"."create_date"
   ORDER BY "report"."allocator",
            "report"."create_date" DESC)
SELECT SUM("checks_count")::INT as "total_checks_count"
FROM "check_per_allocator"