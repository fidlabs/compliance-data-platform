WITH
  "checks_weekly_per_allocator" AS (
    SELECT
      count(
        DISTINCT "check"
      ) FILTER (
        WHERE
          "result" = TRUE
      ) AS "checksPassedCount",
      count(
        DISTINCT "check"
      ) FILTER (
        WHERE
          "result" = FALSE
      ) AS "checksFailedCount",
      date_trunc(
        'week',
        "allocator_report"."create_date"
      ) AS "week"
    FROM
      "allocator_report_check_result"
      JOIN "allocator_report" ON "allocator_report_check_result"."allocator_report_id" = "allocator_report"."id"
    GROUP BY
      "allocator",
      "week"
  ),
  "checks_weekly" AS (
    SELECT
      sum(
        "checksPassedCount"
      )::int AS "checksPassedCount",
      sum(
        "checksFailedCount"
      )::int AS "checksFailedCount",
      "week" AS "week"
    FROM
      "checks_weekly_per_allocator"
    GROUP BY
      "week"
  ),
  "checks_weekly_with_lag" AS (
    SELECT
      *,
      lag(
        "checksPassedCount"
      ) OVER (
        ORDER BY
          "week"
      ) AS "checksPassedCountLag",
      lag(
        "checksFailedCount"
      ) OVER (
        ORDER BY
          "week"
      ) AS "checksFailedCountLag",
      lag("week") OVER (
        ORDER BY
          "week"
      ) AS "weekLag"
    FROM
      "checks_weekly"
  )
SELECT
  "week" AS "week",
  "checksPassedCount" AS "checksPassedCount",
  CASE
    WHEN "weekLag" IS NOT NULL
    AND "week" - "weekLag" = interval '7 days' THEN "checksPassedCount" - "checksPassedCountLag"
  END AS "checksPassedChange",
  "checksFailedCount" AS "checksFailedCount",
  CASE
    WHEN "weekLag" IS NOT NULL
    AND "week" - "weekLag" = interval '7 days' THEN "checksFailedCount" - "checksFailedCountLag"
  END AS "checksFailedChange"
FROM
  "checks_weekly_with_lag"
ORDER BY
  "week" DESC;
