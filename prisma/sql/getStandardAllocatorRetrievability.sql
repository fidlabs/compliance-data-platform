-- question - do we do a cutoff date or just switch for past data as well?
with "open_data_pathway_allocator" as (
    select distinct "allocatorId" as "allocator"
    from "allocator_client_bookkeeping"
    where lower("bookkeeping_info"::"jsonb"->'Project'->>'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)') = '[x] i confirm'
       or lower("bookkeeping_info"::"jsonb"->'Project'->>'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)') = 'yes'
),
     "base_data" as (select "week"                     as "week",
                            "allocator"                as "allocator",
                            "total_sum_of_allocations" as "total_sum_of_allocations",
                            case
                                when $2 = true then "avg_weighted_retrievability_success_rate_http" -- httpRetrievability param $2
                                else "avg_weighted_retrievability_success_rate"
                                end                    as "selected_retrievability"
                     from "allocators_weekly")
select "week"                                       as "week",
       ceil("selected_retrievability" * 20) * 5 - 5 as "valueFromExclusive",
       ceil("selected_retrievability" * 20) * 5     as "valueToInclusive",
       count(*)::int                                as "count",
       sum("total_sum_of_allocations")::bigint      as "totalDatacap"
from "base_data"
         left join "allocator" on "base_data"."allocator" = "allocator"."id"
where (
    $1 = false -- openDataOnly param $1
        or "allocator" in (select "allocator" from "open_data_pathway_allocator")
    )
  and ("allocator"."is_metaallocator" = false or "allocator"."is_metaallocator" is null)
group by "valueFromExclusive", "valueToInclusive", "week"
order by "week", "valueFromExclusive";
