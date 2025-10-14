WITH
  "provider_retrievability_weekly" AS (
    SELECT
      date_trunc(
        'week',
        "provider_retrievability_daily"."date"
      ) AS "week",
      "provider_retrievability_daily"."provider" AS "provider",
      sum("total") AS "total",
      sum(
        "successful"
      ) AS "successful",
      sum(
        "successful"::float
      ) / sum(
        "total"::float
      ) AS "success_rate",
      sum(
        coalesce(
          "successful_http",
          0
        )
      ) AS "successful_http",
      sum(
        coalesce(
          "successful_http",
          0
        )::float
      ) / sum(
        "total"::float
      ) AS "success_rate_http",
      sum(
        coalesce(
          "provider_url_finder_retrievability_daily"."success_rate",
          0
        )::float
      ) / sum(
        "total"::float
      ) AS "success_rate_url_finder"
    FROM
      "provider_retrievability_daily"
      LEFT JOIN "provider_url_finder_retrievability_daily" ON "provider_retrievability_daily"."provider" = "provider_url_finder_retrievability_daily"."provider"
    GROUP BY
      "week",
      "provider_retrievability_daily"."provider"
  )
SELECT
  "week" AS "week",
  "provider" AS "provider",
  count(*)::int AS "num_of_clients",
  max(
    "total_deal_size"
  )::bigint AS "biggest_client_total_deal_size",
  sum(
    "total_deal_size"
  )::bigint AS "total_deal_size",
  max(
    coalesce(
      "success_rate",
      0
    )
  ) AS "avg_retrievability_success_rate",
  max(
    coalesce(
      "success_rate_http",
      0
    )
  ) AS "avg_retrievability_success_rate_http",
  max(
    coalesce(
      "success_rate_url_finder",
      0
    )
  ) AS "avg_retrievability_success_rate_url_finder"
FROM
  "client_provider_distribution_weekly"
  LEFT JOIN "provider_retrievability_weekly" USING (
    "week",
    "provider"
  )
GROUP BY
  "week",
  "provider"
