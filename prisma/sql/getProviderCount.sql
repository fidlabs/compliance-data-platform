-- @param {Boolean} $1:openDataOnly
-- @param {DateTime} $2:startDate
-- @param {DateTime} $3:endDate
WITH
  "open_data_pathway_provider" AS (
    SELECT DISTINCT
      "provider" AS "provider"
    FROM
      "allocator_client_bookkeeping"
      JOIN "client_provider_distribution" ON "allocator_client_bookkeeping"."client_id" = "client_provider_distribution"."client"
    WHERE
      lower(
        "bookkeeping_info"::"jsonb" -> 'Project' ->> 'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)'
      ) = '[x] i confirm'
      OR lower(
        "bookkeeping_info"::"jsonb" -> 'Project' ->> 'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)'
      ) = 'yes'
  )
SELECT
  count(
    DISTINCT "provider"
  )::int AS "count"
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
  AND (
    $2::date IS NULL
    OR "week" >= $2
  )
  AND (
    $3::date IS NULL
    OR "week" <= $3
  )
