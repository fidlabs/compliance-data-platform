-- @param {String} $1:metricType
-- @param {Float} $2:bucketSize
-- @param {DateTime} $3:startDate
-- @param {DateTime} $4:endDate

WITH "metric_data" AS (
    select
    	provider,
        value,
        DATE_TRUNC('week', "tested_at")                       AS "week"
    FROM "storage_provider_url_finder_metric_value"
    JOIN "storage_provider_url_finder_metric"
      ON "storage_provider_url_finder_metric_value"."metric_id" = "storage_provider_url_finder_metric"."id"
    WHERE "storage_provider_url_finder_metric"."metric_type"::text = $1
      AND ($3::date IS NULL OR "tested_at" >= $3)
      AND ($4::date IS NULL OR "tested_at" <= $4)
      AND value IS NOT NULL
),
"provider_weekly" AS (select      "week"            AS "week",
                                  "provider"        AS "provider",
                                  "total_deal_size" AS "total_deal_size"
                           from "providers_weekly_acc"
                           where ($3::date is null or "week" >= $3)
                             and ($4::date is null or "week" <= $4)),
"bucketed" AS (
    SELECT
        "metric_data"."week",
        "metric_data"."provider",
        FLOOR("metric_data"."value" / $2)           AS "bucket_index"
    FROM "metric_data"
),
"bucketed_with_deal" AS (
    SELECT
        "bucketed"."week",
        "bucketed"."bucket_index",
        "provider_weekly"."total_deal_size"
    FROM "bucketed"
    LEFT JOIN "provider_weekly"
      ON "provider_weekly"."week" = "bucketed"."week"
     AND "provider_weekly"."provider" = "bucketed"."provider"
)
SELECT
    "week"                                                    AS "week",
    "bucket_index" * $2                                       AS "valueFromExclusive",
    ("bucket_index" + 1) * $2                                 AS "valueToInclusive",
    COUNT(*)                                                  AS "count",
    SUM("total_deal_size")::bigint                            AS "totalDatacap"
FROM "bucketed_with_deal"
GROUP BY "week", "bucket_index"
ORDER BY "week", "bucket_index";