-- @param {DateTime} $1:startDate
-- @param {DateTime} $2:endDate
WITH
  "providers_with_ratio" AS (
    SELECT
      "week" AS "week",
      "provider" AS "provider",
      max(
        "total_deal_size"
      ) / sum(
        "total_deal_size"
      ) AS "biggestToTotalRatio",
      sum(
        "total_deal_size"
      ) AS "totalDatacap"
    FROM
      "client_provider_distribution_weekly_acc"
    WHERE
      (
        $1::date IS NULL
        OR "week" >= $1
      )
      AND (
        $2::date IS NULL
        OR "week" <= $2
      )
    GROUP BY
      "provider",
      "week"
  )
SELECT
  "week" AS "week",
  100 * ceil(
    "biggestToTotalRatio"::float * 20
  ) / 20 - 5 AS "valueFromExclusive",
  100 * ceil(
    "biggestToTotalRatio"::float * 20
  ) / 20 AS "valueToInclusive",
  count(*)::int AS "count",
  sum(
    "totalDatacap"
  )::bigint AS "totalDatacap"
FROM
  "providers_with_ratio"
GROUP BY
  "valueFromExclusive",
  "valueToInclusive",
  "week"
ORDER BY
  "week",
  "valueFromExclusive";
