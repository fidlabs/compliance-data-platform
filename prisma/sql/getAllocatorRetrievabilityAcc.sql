-- TODO when business is ready switch from normal rate to http date
-- question - do we do a cutoff date or just switch for past data as well?
select
    ceil(avg_weighted_retrievability_success_rate*20)*5 - 5 as "valueFromExclusive",
    ceil(avg_weighted_retrievability_success_rate*20)*5 as "valueToInclusive",
    count(*)::int as "count",
    week
from allocators_weekly_acc
group by 1, 2, week
order by week;
