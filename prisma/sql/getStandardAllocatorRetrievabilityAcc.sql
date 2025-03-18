-- TODO when business is ready switch from normal rate to http date
-- question - do we do a cutoff date or just switch for past data as well?
select "week"                                                        as "week",
       ceil("avg_weighted_retrievability_success_rate" * 20) * 5 - 5 as "valueFromExclusive",
       ceil("avg_weighted_retrievability_success_rate" * 20) * 5     as "valueToInclusive",
       count(*)::int                                                 as "count",
       sum("total_sum_of_allocations")::bigint                       as "totalDatacap"
from "allocators_weekly_acc"
         join "allocator" on "allocators_weekly_acc"."allocator" = "allocator"."id"
where "allocator"."is_metaallocator" = false
group by "valueFromExclusive", "valueToInclusive", "week"
order by "week", "valueFromExclusive";
