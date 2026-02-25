-- @param {DateTime} $1:startDate
-- @param {DateTime} $2:endDate


WITH "daily_metrics" AS (
    SELECT
        "storage_provider_url_finder_metric_value"."provider",
        "storage_provider_url_finder_metric_value"."tested_at"::date AS "day",

        SUM("storage_provider_url_finder_metric_value"."value") FILTER (
            WHERE "storage_provider_url_finder_metric"."metric_type" = 'RPA_RETRIEVABILITY'
        ) AS "rpa",

        SUM("storage_provider_url_finder_metric_value"."value") FILTER (
            WHERE "storage_provider_url_finder_metric"."metric_type" = 'CAR_FILES'
        ) AS "car"

    FROM "storage_provider_url_finder_metric_value"
    JOIN "storage_provider_url_finder_metric"
      ON "storage_provider_url_finder_metric_value"."metric_id" = "storage_provider_url_finder_metric"."id"

    WHERE "storage_provider_url_finder_metric"."metric_type" = 'CAR_FILES'
        AND ($1::date IS NULL OR "storage_provider_url_finder_metric_value"."tested_at" >= $1)
        AND ($2::date IS NULL OR "storage_provider_url_finder_metric_value"."tested_at" <= $2)
        AND "storage_provider_url_finder_metric_value"."value" IS NOT NULL
    GROUP BY "storage_provider_url_finder_metric_value"."provider", "storage_provider_url_finder_metric_value"."tested_at"::date
),

"scored" AS (
    SELECT
        "provider",
        "day",
        "car"           AS "acr",
        (1 - "car")     AS "air"
    FROM "daily_metrics"
),

"bucketed" AS (
    -- ACR
    SELECT
        "provider",
        "day",
        'ACR' AS "metric",
        CEIL("acr" / 0.1) AS "bucket"
    FROM "scored"

    UNION ALL

    -- AIR
    SELECT
        "provider",
        "day",
        'AIR' AS "metric",
        CEIL("air" / 0.1) AS "bucket"
    FROM "scored"
)
SELECT
    "day",
    "metric",
    ROUND((("bucket" - 1) * 0.1)::numeric, 2) AS "valueFromExclusive",
    ROUND(("bucket" * 0.1)::numeric, 2)       AS "valueToInclusive",
    COUNT(DISTINCT "provider") AS "providers_count"
FROM "bucketed"
GROUP BY "day", "metric", "bucket"
ORDER BY "day", "metric", "bucket";