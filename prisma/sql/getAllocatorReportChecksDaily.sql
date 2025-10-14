-- @param {DateTime} $1:week
WITH
  "checks_daily_per_allocator" AS (
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
        'day',
        "allocator_report"."create_date"
      ) AS "day"
    FROM
      "allocator_report_check_result"
      JOIN "allocator_report" ON "allocator_report_check_result"."allocator_report_id" = "allocator_report"."id"
    WHERE
      date_trunc(
        'week',
        "allocator_report"."create_date"
      ) = $1
    GROUP BY
      "allocator",
      "day"
  ),
  "checks_daily" AS (
    SELECT
      sum(
        "checksPassedCount"
      )::int AS "checksPassedCount",
      sum(
        "checksFailedCount"
      )::int AS "checksFailedCount",
      "day"
    FROM
      "checks_daily_per_allocator"
    GROUP BY
      "day"
  ),
  "checks_daily_with_lag" AS (
    SELECT
      *,
      lag(
        "checksPassedCount"
      ) OVER (
        ORDER BY
          "day"
      ) AS "checksPassedCountLag",
      lag(
        "checksFailedCount"
      ) OVER (
        ORDER BY
          "day"
      ) AS "checksFailedCountLag",
      lag("day") OVER (
        ORDER BY
          "day"
      ) AS "dayLag"
    FROM
      "checks_daily"
  )
SELECT
  "day" AS "day",
  "checksPassedCount" AS "checksPassedCount",
  CASE
    WHEN "dayLag" IS NOT NULL
    AND "day" - "dayLag" = interval '1 day' THEN "checksPassedCount" - "checksPassedCountLag"
  END AS "checksPassedChange",
  "checksFailedCount" AS "checksFailedCount",
  CASE
    WHEN "dayLag" IS NOT NULL
    AND "day" - "dayLag" = interval '1 day' THEN "checksFailedCount" - "checksFailedCountLag"
  END AS "checksFailedChange"
FROM
  "checks_daily_with_lag"
ORDER BY
  "day" DESC;
