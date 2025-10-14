-- @param {Boolean} $1:openDataOnly
-- @param {String} $2:retrievabilityType
-- @param {DateTime} $3:week
-- @param {Int} $4:editionId
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
        $4::int IS NULL
        OR "active_allocators"."editionId" = $4
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
  )
SELECT
  CASE
    WHEN $2 = 'http' THEN avg(
      "avg_weighted_retrievability_success_rate_http"
    )
    WHEN $2 = 'urlFinder' THEN avg(
      "avg_weighted_retrievability_success_rate_url_finder"
    )
    ELSE avg(
      "avg_weighted_retrievability_success_rate"
    )
  END AS "average"
FROM
  "allocators_weekly_acc"
  LEFT JOIN "allocator" ON "allocators_weekly_acc"."allocator" = "allocator"."id"
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
  AND "week" = $3::timestamp;
