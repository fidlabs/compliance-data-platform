-- @param {DateTime} $1:startDate
-- @param {DateTime} $2:endDate

with "allocators_with_ratio" as (select "week"                                                as "week",
                                        "allocator"                                           as "allocator",
                                        max("sum_of_allocations") / sum("sum_of_allocations") as "biggestToTotalRatio",
                                        sum("sum_of_allocations")                             as "totalDatacap"
                                 from "client_allocator_distribution_weekly_acc"
                                 where "week" >= $1
                                   and "week" <= $2
                                 group by "week", "allocator")
select "week"                                                 as "week",
       100 * ceil("biggestToTotalRatio"::float * 20) / 20 - 5 as "valueFromExclusive",
       100 * ceil("biggestToTotalRatio"::float * 20) / 20     as "valueToInclusive",
       count(*)::int                                          as "count",
       sum("totalDatacap")::bigint                            as "totalDatacap"
from "allocators_with_ratio"
         left join "allocator" on "allocators_with_ratio"."allocator" = "allocator"."id"
where "is_metaallocator" = false or "is_metaallocator" is null
group by "valueFromExclusive", "valueToInclusive", "week"
order by "week", "valueFromExclusive";
