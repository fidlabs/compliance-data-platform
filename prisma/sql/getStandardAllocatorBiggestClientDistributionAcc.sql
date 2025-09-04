-- @param {DateTime} $1:startDate
-- @param {DateTime} $2:endDate
-- @param {Int} $3:editionId

with "active_allocators" as (
    select "allocator_id", 6 as "editionId"
    from "allocator_registry"
    where "rejected" = false

    UNION ALL

    select "allocator_id", 5 as "editionId"
    from "allocator_registry_archive"
    where "rejected" = false
),
"active_in_edition" as (
	select * from "active_allocators" where ($3::int is null or "active_allocators"."editionId" = $3)
),
"allocators_with_ratio" as (select "week"                                                as "week",
                                        "allocator"                                           as "allocator",
                                        max("sum_of_allocations") / sum("sum_of_allocations") as "biggestToTotalRatio",
                                        sum("sum_of_allocations")                             as "totalDatacap"
                                from "client_allocator_distribution_weekly_acc"
                                where 
                                    ($1::date is null or "week" >= $1) and ($2::date is null or "week" <= $2)
                                group by "week", "allocator")
select "week"                                                 as "week",
       100 * ceil("biggestToTotalRatio"::float * 20) / 20 - 5 as "valueFromExclusive",
       100 * ceil("biggestToTotalRatio"::float * 20) / 20     as "valueToInclusive",
       count(*)::int                                          as "count",
       sum("totalDatacap")::bigint                            as "totalDatacap"
from "allocators_with_ratio"
        left join "allocator" on "allocators_with_ratio"."allocator" = "allocator"."id"
        join "active_in_edition" on "active_in_edition"."allocator_id" = "allocator"."id"
where "is_metaallocator" = false or "is_metaallocator" is null
group by "valueFromExclusive", "valueToInclusive", "week"
order by "week", "valueFromExclusive";
