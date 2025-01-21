with
    provider_retrievability_weekly as (
        select
            date_trunc('week', date) as week,
            provider,
            sum(total) as total,
            sum(successful) as successful,
            sum(successful::float8)/sum(total::float8) as success_rate,
            sum(coalesce(successful_http, 0)) as successful_http,
            sum(coalesce(successful_http, 0)::float8)/sum(total::float8) as success_rate_http
        from provider_retrievability_daily
        group by
            week,
            provider
    )
select
    week,
    provider,
    count(*)::int as num_of_clients,
    max(total_deal_size)::bigint as biggest_client_total_deal_size,
    sum(total_deal_size)::bigint as total_deal_size,
    max(coalesce(success_rate, 0)) as avg_retrievability_success_rate,
    max(coalesce(success_rate_http, 0)) as avg_retrievability_success_rate_http
from client_provider_distribution_weekly_acc as cpdwa
left join provider_retrievability_weekly as prw using (week, provider)
group by
    week,
    provider;
