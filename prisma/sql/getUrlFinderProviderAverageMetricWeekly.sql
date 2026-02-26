-- @param {String} $1:metricType
-- @param {String} $2:provider
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
      AND value IS NOT null
      AND provider = $2
)
select 
		provider,
		week,
		AVG(value) as "avg_value"
	from metric_data
	group by provider, week;