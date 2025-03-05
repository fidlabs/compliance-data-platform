select "week"                                  as "week",
       ("num_of_clients" - 1)::int             as "valueFromExclusive",
       "num_of_clients"::int                   as "valueToInclusive",
       count(*)::int                           as "count",
       sum("total_sum_of_allocations")::bigint as "totalDatacap"
from "allocators_weekly"
group by "valueFromExclusive", "valueToInclusive", "week"
order by "week", "valueFromExclusive";
