-- TODO when business is ready switch from normal rate to http date
-- question - do we do a cutoff date or just switch for past data as well?
select
    week                       as "week",
    ceil(avg_weighted_retrievability_success_rate*20)*5 - 5 as "valueFromExclusive",
    ceil(avg_weighted_retrievability_success_rate*20)*5 as "valueToInclusive",
    count(*)::int as "count",
    sum(total_sum_of_allocations)::float as "totalDatacap"
from allocators_weekly
group by 1, 2, week
order by week;
