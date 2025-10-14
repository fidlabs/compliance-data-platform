-- @param {Boolean} $1:openDataOnly
-- @param {String} $2:retrievabilityType
-- @param {DateTime} $3:startDate
-- @param {DateTime} $4:endDate
-- @param {Int} $5:editionId
-- question - do we do a cutoff date or just switch for past data as well?
WITH
  "active_allocators" AS (
    SELECT
      "allocator_id",
      "registry_info",
      6 AS "editionId"
    FROM
      "allocator_registry"
    WHERE
      "rejected" = FALSE
    UNION ALL
    SELECT
      "allocator_id",
      "registry_info",
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
        $5::int IS NULL
        OR "active_allocators"."editionId" = $5
      )
  ),
  "open_data_pathway_allocators" AS (
    -- edition 5: open by bookkeeping
    SELECT DISTINCT
      "allocator_client_bookkeeping"."allocator_id"
    FROM
      "allocator_client_bookkeeping"
      JOIN "active_in_edition" ON "allocator_client_bookkeeping"."allocator_id" = "active_in_edition"."allocator_id"
    WHERE
      "active_in_edition"."editionId" = 5
      AND lower(
        "allocator_client_bookkeeping"."bookkeeping_info"::jsonb -> 'Project' ->> 'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)'
      ) IN (
        '[x] i confirm',
        'yes'
      )
    UNION
    -- edition 6: open = not enterprise, automated, faucet, market based
    SELECT DISTINCT
      "active_in_edition"."allocator_id"
    FROM
      "active_in_edition"
    WHERE
      "active_in_edition"."editionId" = 6
      AND NOT (
        (
          "active_in_edition"."registry_info"::jsonb -> 'application' -> 'audit'
        ) ?| ARRAY[
          'Enterprise Data',
          'Automated',
          'Faucet',
          'Market Based'
        ]
      )
  ),
  "allocator_weekly" AS (
    SELECT
      "week" AS "week",
      "allocator" AS "allocator",
      "total_sum_of_allocations" AS "total_sum_of_allocations",
      CASE
        WHEN $2 = 'http' THEN "avg_weighted_retrievability_success_rate_http"
        WHEN $2 = 'urlFinder' THEN "avg_weighted_retrievability_success_rate_url_finder"
        ELSE "avg_weighted_retrievability_success_rate"
      END AS "selected_retrievability"
    FROM
      "allocators_weekly_acc"
    WHERE
      (
        $3::date IS NULL
        OR "week" >= $3
      )
      AND (
        $4::date IS NULL
        OR "week" <= $4
      )
  )
SELECT
  "week" AS "week",
  ceil(
    "selected_retrievability" * 20
  ) * 5 - 5 AS "valueFromExclusive",
  ceil(
    "selected_retrievability" * 20
  ) * 5 AS "valueToInclusive",
  count(*)::int AS "count",
  sum(
    "total_sum_of_allocations"
  )::bigint AS "totalDatacap"
FROM
  "allocator_weekly"
  LEFT JOIN "allocator" ON "allocator_weekly"."allocator" = "allocator"."id"
  JOIN "active_in_edition" ON "active_in_edition"."allocator_id" = "allocator"."id"
WHERE
  (
    $1 = FALSE
    OR "allocator" IN (
      SELECT
        "allocator_id"
      FROM
        "open_data_pathway_allocators"
    )
  )
  AND (
    "is_metaallocator" = FALSE
    OR "is_metaallocator" IS NULL
  )
GROUP BY
  "valueFromExclusive",
  "valueToInclusive",
  "week"
ORDER BY
  "week",
  "valueFromExclusive";
