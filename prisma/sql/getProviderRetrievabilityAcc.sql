-- @param {Boolean} $1:openDataOnly
-- @param {String} $2:retrievabilityType
-- @param {DateTime} $3:startDate
-- @param {DateTime} $4:endDate
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
  ),
  "provider_weekly" AS (
    SELECT
      "week" AS "week",
      "provider" AS "provider",
      "total_deal_size" AS "total_deal_size",
      CASE
        WHEN $2 = 'http' THEN "avg_retrievability_success_rate_http"
        WHEN $2 = 'urlFinder' THEN "avg_retrievability_success_rate_url_finder"
        ELSE "avg_retrievability_success_rate"
      END AS "selected_retrievability"
    FROM
      "providers_weekly_acc"
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
  100 * ceil(
    "selected_retrievability" * 20
  ) / 20 - 5 AS "valueFromExclusive",
  100 * ceil(
    "selected_retrievability" * 20
  ) / 20 AS "valueToInclusive",
  count(*)::int AS "count",
  sum(
    "total_deal_size"
  )::bigint AS "totalDatacap"
FROM
  "provider_weekly"
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
GROUP BY
  "week",
  "valueFromExclusive",
  "valueToInclusive"
ORDER BY
  "week",
  "valueFromExclusive";
