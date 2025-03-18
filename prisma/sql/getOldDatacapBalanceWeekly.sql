with
weeks as (
    select date_trunc('week', "dates") as "week"
    from
        generate_series(
            to_timestamp(3847920 * 30 + 1598306400),
            current_timestamp,
            '1 week'::interval
        ) as dates
),

old_allocators_weekly as (
    select distinct
        weeks.week,
        old_datacap_balance_nv22.allocator
    from weeks, old_datacap_balance_nv22
)

select
    old_allocators_weekly.week,
    old_allocators_weekly.allocator,
    greatest(
        0,
        (
            old_datacap_balance_nv22.old_dc_balance
            -
            coalesce(allocators_weekly_acc.total_sum_of_allocations, 0)
        )
    ) as old_dc_balance
from old_allocators_weekly
inner join old_datacap_balance_nv22 using (allocator)
left join allocators_weekly_acc using (week, allocator)
