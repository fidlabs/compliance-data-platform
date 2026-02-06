-- @param {String} $1:metricType
-- @param {Float} $2:bucketSize
-- @param {DateTime} $3:startDate
-- @param {DateTime} $4:endDate

WITH "metric_data" AS (
    SELECT
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
"bucketed" AS (
    SELECT
        "week"                                                AS "week",
        FLOOR(value / $2)                                     AS "bucket_index",
        value                                                 AS "value"
    FROM "metric_data"
)
SELECT
    "week"                                                    AS "week",
    "bucket_index" * $2                                       AS "valueFromExclusive",
    ("bucket_index" + 1) * $2                                 AS "valueToInclusive",
    COUNT(*)                                                  AS count
FROM "bucketed"
GROUP BY "week", "bucket_index"
ORDER BY "week", "bucket_index";