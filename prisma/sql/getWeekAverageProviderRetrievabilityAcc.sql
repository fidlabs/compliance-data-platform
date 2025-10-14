-- @param {Boolean} $1:openDataOnly
-- @param {String} $2:retrievabilityType
-- @param {DateTime} $3:week
-- @param {Int} $4:editionId
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
        $4::int IS NULL
        OR "active_allocators"."editionId" = $4
      )
  ),
  "open_data_pathway_provider" AS (
    SELECT DISTINCT
      "provider" AS "provider"
    FROM
      "allocator_client_bookkeeping"
      JOIN "client_provider_distribution" ON "allocator_client_bookkeeping"."client_id" = "client_provider_distribution"."client"
      JOIN "active_in_edition" ON "active_in_edition"."allocator_id" = "allocator_client_bookkeeping"."allocator_id"
    WHERE
      lower(
        "bookkeeping_info"::"jsonb" -> 'Project' ->> 'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)'
      ) = '[x] i confirm'
      OR lower(
        "bookkeeping_info"::"jsonb" -> 'Project' ->> 'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)'
      ) = 'yes'
  )
SELECT
  CASE
    WHEN $2 = 'http' THEN avg(
      "avg_retrievability_success_rate_http"
    )
    WHEN $2 = 'urlFinder' THEN avg(
      "avg_retrievability_success_rate_url_finder"
    )
    ELSE avg(
      "avg_retrievability_success_rate"
    )
  END AS "average"
FROM
  "providers_weekly_acc"
WHERE
  (
    $1 = FALSE
    OR "provider" IN (
      SELECT
        "provider"
      FROM
        "open_data_pathway_provider"
    )
  )
  AND "week" = $3::timestamp;
