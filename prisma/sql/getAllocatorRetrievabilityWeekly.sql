WITH
  allocator_retrievability AS (
    SELECT
      week,
      allocator,
      sum(
        cpdwa.total_deal_size * coalesce(
          avg_retrievability_success_rate,
          0
        )
      ) / sum(
        cpdwa.total_deal_size
      ) AS avg_weighted_retrievability_success_rate,
      sum(
        cpdwa.total_deal_size * coalesce(
          avg_retrievability_success_rate_http,
          0
        )
      ) / sum(
        cpdwa.total_deal_size
      ) AS avg_weighted_retrievability_success_rate_http,
      sum(
        cpdwa.total_deal_size * coalesce(
          avg_retrievability_success_rate_url_finder,
          0
        )
      ) / sum(
        cpdwa.total_deal_size
      ) AS avg_weighted_retrievability_success_rate_url_finder
    FROM
      client_allocator_distribution_weekly_acc
      INNER JOIN client_provider_distribution_weekly_acc AS cpdwa USING (
        client,
        week
      )
      LEFT JOIN providers_weekly USING (
        provider,
        week
      )
    GROUP BY
      week,
      allocator
  )
SELECT
  week,
  allocator,
  count(*)::int AS num_of_clients,
  max(
    sum_of_allocations
  )::bigint AS biggest_client_sum_of_allocations,
  sum(
    sum_of_allocations
  )::bigint AS total_sum_of_allocations,
  max(
    coalesce(
      avg_weighted_retrievability_success_rate,
      0
    )
  ) AS avg_weighted_retrievability_success_rate,
  max(
    coalesce(
      avg_weighted_retrievability_success_rate_http,
      0
    )
  ) AS avg_weighted_retrievability_success_rate_http,
  max(
    coalesce(
      avg_weighted_retrievability_success_rate_url_finder,
      0
    )
  ) AS avg_weighted_retrievability_success_rate_url_finder
FROM
  client_allocator_distribution_weekly_acc
  LEFT JOIN allocator_retrievability USING (
    week,
    allocator
  )
GROUP BY
  week,
  allocator;
