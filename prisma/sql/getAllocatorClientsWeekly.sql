with "clients_per_allocator" as (select "week"                    as "week",
                                        count(distinct "client")  as "clientsCount",
                                        sum("sum_of_allocations") as "totalDatacap"
                                 from "client_allocator_distribution_weekly"
                                 group by "allocator", "week")
select "week"                      as "week",
       ("clientsCount" - 1)::int   as "valueFromExclusive",
       "clientsCount"::int         as "valueToInclusive",
       count(*)::int               as "count",
       sum("totalDatacap")::bigint as "totalDatacap"
from "clients_per_allocator"
group by "valueFromExclusive", "valueToInclusive", "week"
order by "week", "valueFromExclusive";
