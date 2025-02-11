with allocators_with_ratio as (
    select
        week,
        allocator,
        max(sum_of_allocations) / sum(sum_of_allocations) biggest_to_total_ratio,
        sum(sum_of_allocations) as "totalDatacap"
    from client_allocator_distribution_weekly_acc
    group by
        week,
        allocator
)
select
    week,
    100 * ceil(biggest_to_total_ratio::float8 * 20) / 20 - 5 as "valueFromExclusive",
    100 * ceil(biggest_to_total_ratio::float8 * 20) / 20 as "valueToInclusive",
    count(*)::int as count,
    sum("totalDatacap")::float as "totalDatacap"
from allocators_with_ratio
group by
    week,
    "valueFromExclusive",
    "valueToInclusive"
order by
    week,
    "valueFromExclusive";