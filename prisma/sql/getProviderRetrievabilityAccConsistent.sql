-- @param {String} $1:dataType
-- @param {DateTime} $2:startDate
-- @param {DateTime} $3:endDate
-- @param {String} $4:retrievabilityType

WITH "open_data_pathway_provider" AS (
    SELECT DISTINCT "provider"
    FROM "allocator_client_bookkeeping"
    JOIN "client_provider_distribution" 
      ON "allocator_client_bookkeeping"."client_id" = "client_provider_distribution"."client"
    WHERE LOWER(
        "allocator_client_bookkeeping"."bookkeeping_info"::jsonb->'Project'->>'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)'
    ) IN ('[x] i confirm', 'yes')
),
"url_finder_metrics" AS (
    SELECT
        "storage_provider_url_finder_metric_value"."provider",
        "storage_provider_url_finder_metric_value"."tested_at"::date AS "day",
        "storage_provider_url_finder_metric"."metric_type",
        "storage_provider_url_finder_metric_value"."value"
    FROM "storage_provider_url_finder_metric_value"
    JOIN "storage_provider_url_finder_metric"
      ON "storage_provider_url_finder_metric_value"."metric_id" = "storage_provider_url_finder_metric"."id"
    WHERE "storage_provider_url_finder_metric"."metric_type" = 'CAR_FILES'
    AND ($2::date is null or "tested_at" >= $2)
 	AND ($3::date is null or "tested_at" <= $3)
    AND ("storage_provider_url_finder_metric_value"."value" IS NOT NULL)
),
"url_finder_daily_values" AS (
    SELECT
        r."provider",
        r."day",
        c."value" AS "car"
    FROM "url_finder_metrics" r
    JOIN "url_finder_metrics" c
      ON r."provider" = c."provider"
     AND r."day" = c."day"
     AND c."metric_type" = 'CAR_FILES'
),
"url_finder_weekly_avg" AS (
    SELECT
        "provider",
        DATE_TRUNC('week', "day")::date AS "week",
        AVG(
            CASE
                WHEN $4::text = 'CONSISTENT' THEN "car"
                WHEN $4::text = 'INCONSISTENT' THEN 1 - "car"
            END
        ) AS "selected_retrievability"
    FROM "url_finder_daily_values"
    GROUP BY
        "provider",
        DATE_TRUNC('week', "day")::date
),

"provider_weekly" AS (
    SELECT
        "providers_weekly_acc"."week"     AS "week",
        "providers_weekly_acc"."provider" AS "provider",
        "providers_weekly_acc"."total_deal_size",
        "url_finder_weekly_avg"."selected_retrievability"
    FROM "providers_weekly_acc"
    INNER JOIN "url_finder_weekly_avg"
      ON "url_finder_weekly_avg"."week" = "providers_weekly_acc"."week"
     	AND "url_finder_weekly_avg"."provider" = "providers_weekly_acc"."provider"
    WHERE ($2::date is null or "providers_weekly_acc"."week" >= $2) and ($3::date is null or "providers_weekly_acc"."week" <= $3)
)
                             
select "provider_weekly"."week"                                              	as "week",
       100 * ceil("selected_retrievability" * 20) / 20 - 5 as "valueFromExclusive",
       100 * ceil("selected_retrievability" * 20) / 20     as "valueToInclusive",
       count(*)::int                                       as "count",
       sum("total_deal_size")::bigint                      as "totalDatacap"
from "provider_weekly"
    left join "open_data_pathway_provider" using ("provider")
where (($1 = 'openData' and "open_data_pathway_provider"."provider" is not null) or
       ($1 = 'enterprise' and "open_data_pathway_provider"."provider" is null) or
       ($1 is null))
group by "week", "valueFromExclusive", "valueToInclusive"
order by "week", "valueFromExclusive";