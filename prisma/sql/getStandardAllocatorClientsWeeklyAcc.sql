select "week"                                  as "week",
       ("num_of_clients" - 1)::int             as "valueFromExclusive",
       "num_of_clients"::int                   as "valueToInclusive",
       count(*)::int                           as "count",
       sum("total_sum_of_allocations")::bigint as "totalDatacap"
from "allocators_weekly_acc"
         left join "allocator" on "allocators_weekly_acc"."allocator" = "allocator"."id"
where "is_metaallocator" = false or "is_metaallocator" is null
group by "valueFromExclusive", "valueToInclusive", "week"
order by "week", "valueFromExclusive";
