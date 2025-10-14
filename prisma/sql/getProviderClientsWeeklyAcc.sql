-- @param {DateTime} $1:startDate
-- @param {DateTime} $2:endDate
WITH
  "clients_per_provider" AS (
    SELECT
      "week" AS "week",
      count(
        DISTINCT "client"
      ) AS "clientsCount",
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
  (
    "clientsCount" - 1
  )::int AS "valueFromExclusive",
  "clientsCount"::int AS "valueToInclusive",
  count(*)::int AS "count",
  sum(
    "totalDatacap"
  )::bigint AS "totalDatacap"
FROM
  "clients_per_provider"
GROUP BY
  "valueFromExclusive",
  "valueToInclusive",
  "week"
ORDER BY
  "week",
  "valueFromExclusive";
