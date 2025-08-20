-- @param {Boolean} $1:openDataOnly
-- @param {Boolean} $2:httpRetrievability
-- @param {DateTime} $3:startDate
-- @param {DateTime} $4:endDate
-- @param {Int} $5:editionId

-- question - do we do a cutoff date or just switch for past data as well?
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
	select * from "active_allocators" where ($5::int is null or "active_allocators"."editionId" = $5)
),
"open_data_pathway_allocator" as (
    select distinct "allocator_id" as "allocator"
    from "allocator_client_bookkeeping"
    where lower("bookkeeping_info"::"jsonb"->'Project'->>'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)') = '[x] i confirm'
       or lower("bookkeeping_info"::"jsonb"->'Project'->>'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)') = 'yes'
),
     "allocator_weekly" as (select "week"              as "week",
                            "allocator"                as "allocator",
                            "total_sum_of_allocations" as "total_sum_of_allocations",
                            case
                                when $2 = true then "avg_weighted_retrievability_success_rate_http"
                                else "avg_weighted_retrievability_success_rate"
                                end                    as "selected_retrievability"
                        from "allocators_weekly_acc"
                        where ($3::date is null or "week" >= $3)
                        and ($4::date is null or "week" <= $4)
                    )
select "week"                                       as "week",
       ceil("selected_retrievability" * 20) * 5 - 5 as "valueFromExclusive",
       ceil("selected_retrievability" * 20) * 5     as "valueToInclusive",
       count(*)::int                                as "count",
       sum("total_sum_of_allocations")::bigint      as "totalDatacap"
from "allocator_weekly"
        left join "allocator" on "allocator_weekly"."allocator" = "allocator"."id"
        join "active_in_edition" on "active_in_edition"."allocator_id" = "allocator"."id"

where (
    $1 = false
        or "allocator" in (select "allocator" from "open_data_pathway_allocator")
    )
  and ("is_metaallocator" = false or "is_metaallocator" is null)
group by "valueFromExclusive", "valueToInclusive", "week"
order by "week", "valueFromExclusive";
