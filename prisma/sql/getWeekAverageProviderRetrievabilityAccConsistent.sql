-- @param {String} $1:dataType
-- @param {DateTime} $2:week
-- @param {Int} $3:editionId

with "active_allocators" as (select "allocator_id" as "allocator_id",
                                    6              as "editionId"
                             from "allocator_registry"
                             where "rejected" = false

                             union all

                             select "allocator_id" as "allocator_id",
                                    5              as "editionId"
                             from "allocator_registry_archive"
                             where "rejected" = false),
--
     "active_in_edition" as (select *
                             from "active_allocators"
                             where (
                                       $3::int is null
                                           or "active_allocators"."editionId" = $3)),
--
     "open_data_pathway_provider" as (select distinct "provider" as "provider"
                                      from "allocator_client_bookkeeping"
                                               join "client_provider_distribution" on "allocator_client_bookkeeping"."client_id" = "client_provider_distribution"."client"
                                               join "active_in_edition" on "active_in_edition"."allocator_id" = "allocator_client_bookkeeping"."allocator_id"
                                      where lower(
                                                    "allocator_client_bookkeeping"."bookkeeping_info"::jsonb->'Project'->>'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)'
                                            ) in ('[x] i confirm', 'yes')),
--
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
    WHERE DATE_TRUNC('week', "day")::date = $2::timestamp
    GROUP BY
        "provider",
        DATE_TRUNC('week', "day")::date
)

select avg("selected_retrievability") as "urlFinder"
from "url_finder_weekly_avg"
    left join "open_data_pathway_provider" using ("provider")
where (($1 = 'openData' and "open_data_pathway_provider"."provider" is not null) or
       ($1 = 'enterprise' and "open_data_pathway_provider"."provider" is null) or
       ($1 is null))
  and "week" = $2::timestamp;
