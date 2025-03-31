with
weeks as (
    select date_trunc('week', "dates") as "week"
    from
        generate_series(
            to_timestamp(3698160 * 30 + 1598306400) - interval '1 week', -- 1 week before start of nv22
            current_timestamp,
            '1 week'::interval
        ) as dates
),

base_balance as (
    select
        week,
        client,
        old_dc_balance
    from weeks, old_datacap_client_balance_nv22
),

dc_usage as (
    select
        week,
        client,
        allocator,
        sum_of_allocations,
        sum(sum_of_allocations) over (partition by allocator order by week asc, client asc) as total_used_by_allocator
    from client_allocator_distribution_weekly
    order by week
),

remaining_old_dc as (
    select
        dc_usage.week,
        dc_usage.client,
        dc_usage.sum_of_allocations,
        old_datacap_balance_nv22.old_dc_balance - dc_usage.total_used_by_allocator as remaining_old_dc_on_allocator
    from dc_usage
    inner join old_datacap_balance_nv22
        using (allocator)
),

old_dc_allocations as (
    select
        week,
        client,
        sum(greatest(
            0,
            least(
                sum_of_allocations,
                sum_of_allocations + remaining_old_dc_on_allocator
            )
        ))::bigint as old_dc_allocated
    from remaining_old_dc
    group by
        week,
        client
),

weekly_claims as (
    select
        client,
        date_trunc('week', hour) as "week",
        sum(total_deal_size) as total_claims
    from client_claims_hourly
    group by client, "week"
),

old_dc_balance as (
    select
        week,
        client,
        total_claims,
        sum(coalesce(old_dc_allocations.old_dc_allocated,0)) over (partition by client, week) as allocations,
        greatest(
            0,
            coalesce(base_balance.old_dc_balance, 0)                                -- what client had at current fil+ edition start
            + sum(coalesce(old_dc_allocations.old_dc_allocated, 0)) over w          -- old dc client got up to this week
            - sum(coalesce(weekly_claims.total_claims, 0)) over w                   -- all client spent up to this week
        ) as old_dc_balance
    from old_dc_allocations
    full join base_balance using (week, client)
    left join weekly_claims using (week, client)
    window w as (partition by client order by week)
),

balance_and_claims as (
    select
        week,
        client,
        old_dc_balance::bigint,
        allocations,
        total_claims,
        coalesce(
            (
                lag(old_dc_balance) over (partition by client order by week asc) -- balance from previous week
                + allocations -- what we got from allocator this week
                - old_dc_balance -- current balance
            ),
            0
        )::bigint as claims
    from old_dc_balance
)

select
    week,
    client,
    allocations,
    old_dc_balance::bigint,
    total_claims,
    claims::bigint
from balance_and_claims
where (old_dc_balance > 0 or claims > 0)
order by week;
