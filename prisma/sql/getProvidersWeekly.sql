WITH provider_retrievability_weekly AS (
    SELECT
        prd."week",
        prd."provider",
        SUM(prd."total") AS total,
        SUM(prd."successful") AS successful,
        SUM(prd."successful"::float) / SUM(prd."total"::float) AS success_rate,
        SUM(COALESCE(prd."successful_http", 0)) AS successful_http,
        SUM(COALESCE(prd."successful_http", 0)::float) / SUM(prd."total"::float) AS success_rate_http,
        COALESCE(
            (
                SELECT puf."success_rate"
                FROM "provider_url_finder_retrievability_daily" puf
                WHERE puf."provider" = prd."provider"
                  AND DATE_TRUNC('week', puf."date") = prd."week"
                ORDER BY puf."date" DESC
                LIMIT 1
            ), 0
        ) AS success_rate_url_finder
    FROM (
        SELECT
            DATE_TRUNC('week', "date") AS "week",
            "provider",
            "total",
            "successful",
            "successful_http"
        FROM "provider_retrievability_daily"
    ) AS prd
    GROUP BY prd."week", prd."provider"
)
SELECT 
    COALESCE(prw."week", DATE_TRUNC('week', cpw."week")) AS week,
    cpw."provider",
    COUNT(*)::int AS num_of_clients,
    MAX(cpw."total_deal_size")::bigint AS biggest_client_total_deal_size,
    SUM(cpw."total_deal_size")::bigint AS total_deal_size,
    MAX(COALESCE(prw."success_rate", 0)) AS avg_retrievability_success_rate,
    MAX(COALESCE(prw."success_rate_http", 0)) AS avg_retrievability_success_rate_http,
    MAX(COALESCE(prw."success_rate_url_finder", 0)) AS avg_retrievability_success_rate_url_finder
FROM "client_provider_distribution_weekly" cpw
LEFT JOIN provider_retrievability_weekly prw
    ON DATE_TRUNC('week', cpw."week") = prw."week"
   AND cpw."provider" = prw."provider"
GROUP BY
    COALESCE(prw."week", DATE_TRUNC('week', cpw."week")),
    cpw."provider";



