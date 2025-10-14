-- @param {DateTime} $1:startDate
-- @param {DateTime} $2:endDate
-- @param {Int} $3:editionId
WITH
  "active_allocators" AS (
    SELECT
      "allocator_id",
      6 AS "editionId"
    FROM
      "allocator_registry"
    WHERE
      "rejected" = FALSE
    UNION ALL
    SELECT
      "allocator_id",
      5 AS "editionId"
    FROM
      "allocator_registry_archive"
    WHERE
      "rejected" = FALSE
  ),
  "active_in_edition" AS (
    SELECT
      *
    FROM
      "active_allocators"
    WHERE
      (
        $3::int IS NULL
        OR "active_allocators"."editionId" = $3
      )
  ),
  "allocators_with_ratio" AS (
    SELECT
      "week" AS "week",
      "allocator" AS "allocator",
      max(
        "sum_of_allocations"
      ) / sum(
        "sum_of_allocations"
      ) AS "biggestToTotalRatio",
      sum(
        "sum_of_allocations"
      ) AS "totalDatacap"
    FROM
      "client_allocator_distribution_weekly_acc"
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
      "week",
      "allocator"
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
  "allocators_with_ratio"
  LEFT JOIN "allocator" ON "allocators_with_ratio"."allocator" = "allocator"."id"
  JOIN "active_in_edition" ON "active_in_edition"."allocator_id" = "allocator"."id"
WHERE
  "is_metaallocator" = FALSE
  OR "is_metaallocator" IS NULL
GROUP BY
  "valueFromExclusive",
  "valueToInclusive",
  "week"
ORDER BY
  "week",
  "valueFromExclusive";
