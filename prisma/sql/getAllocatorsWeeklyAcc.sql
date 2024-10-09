with
    allocator_retrievability as (
        select
            week,
            allocator,
            sum(cpdwa.total_deal_size*coalesce(avg_retrievability_success_rate, 0))/sum(cpdwa.total_deal_size) as avg_weighted_retrievability_success_rate
        from client_allocator_distribution_weekly_acc
        inner join client_provider_distribution_weekly_acc as cpdwa
            using (client, week)
        left join providers_weekly using (provider, week)
        group by
            week,
            allocator
    )
select
    week,
    allocator,
    count(*)::int as num_of_clients,
    max(sum_of_allocations)::bigint as biggest_client_sum_of_allocations,
    sum(sum_of_allocations)::bigint as total_sum_of_allocations,
    max(coalesce(avg_weighted_retrievability_success_rate, 0)) as avg_weighted_retrievability_success_rate
from client_allocator_distribution_weekly_acc
left join allocator_retrievability
    using (week, allocator)
group by
    week,
    allocator;