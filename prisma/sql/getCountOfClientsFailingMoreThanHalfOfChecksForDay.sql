-- @param {DateTime} $1:day Date for which report checks will be counted
 WITH "summary_for_client" AS
  (SELECT DISTINCT ON ("report"."client") "report"."client",
                      COUNT("check"."id") AS "checks_count",
                      COUNT("check"."id") FILTER (
                                                  WHERE "check"."result" = FALSE) AS "failed_checks"
   FROM "client_report" AS "report"
   JOIN "client_report_check_result" AS "check" ON "check"."client_report_id" = "report"."id"
   WHERE "check"."create_date" BETWEEN date_trunc('day', $1::DATE) AND date_trunc('day', $1::DATE) + '1 day'::INTERVAL
   GROUP BY "report"."client",
            "report"."create_date"
   ORDER BY "report"."client",
            "report"."create_date" DESC)
SELECT COUNT("entry"."client") AS "total_clients_count",
       COUNT("entry"."client") FILTER (
                                       WHERE "entry"."failed_checks" * 2 > "entry"."checks_count") AS "failing_clients_count"
FROM "summary_for_client" AS "entry"
LIMIT 1