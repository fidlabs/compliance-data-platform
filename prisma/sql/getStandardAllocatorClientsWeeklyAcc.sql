-- @param {DateTime} $1:startDate
-- @param {DateTime} $2:endDate
SELECT
  "week" AS "week",
  (
    "num_of_clients" - 1
  )::int AS "valueFromExclusive",
  "num_of_clients"::int AS "valueToInclusive",
  count(*)::int AS "count",
  sum(
    "total_sum_of_allocations"
  )::bigint AS "totalDatacap"
FROM
  "allocators_weekly_acc"
  LEFT JOIN "allocator" ON "allocators_weekly_acc"."allocator" = "allocator"."id"
WHERE
  (
    "is_metaallocator" = FALSE
    OR "is_metaallocator" IS NULL
  )
  AND (
    $1::date IS NULL
    OR "week" >= $1
  )
  AND (
    $2::date IS NULL
    OR "week" <= $2
  )
GROUP BY
  "valueFromExclusive",
  "valueToInclusive",
  "week"
ORDER BY
  "week",
  "valueFromExclusive";
