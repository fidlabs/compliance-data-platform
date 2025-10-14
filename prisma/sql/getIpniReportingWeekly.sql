-- @param {DateTime} $1:startDate
-- @param {DateTime} $2:endDate
WITH
  "with_week" AS (
    SELECT
      "date",
      "ok",
      "misreporting",
      "not_reporting",
      "total",
      date_trunc(
        'week',
        "date"
      ) AS "week"
    FROM
      "ipni_reporting_daily"
    WHERE
      (
        $1::date IS NULL
        OR "date" >= $1
      )
      AND (
        $2::date IS NULL
        OR "date" <= $2
      )
  )
SELECT DISTINCT
  ON ("week") "week",
  "ok",
  "not_reporting",
  "misreporting",
  "total"
FROM
  "with_week"
ORDER BY
  "week",
  "date" DESC;
