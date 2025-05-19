-- TODO when business is ready switch from normal rate to http date
-- question - do we do a cutoff date or just switch for past data as well?
with "open_data_pathway_allocator" as (
    select distinct "allocatorId" as "allocator"
    from "allocator_client_bookkeeping"
    where lower("bookkeeping_info"::"jsonb"->'Project'->>'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)') = '[x] i confirm'
       or lower("bookkeeping_info"::"jsonb"->'Project'->>'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)') = 'yes'
)
select "week"                                                        as "week",
       ceil("avg_weighted_retrievability_success_rate" * 20) * 5 - 5 as "valueFromExclusive",
       ceil("avg_weighted_retrievability_success_rate" * 20) * 5     as "valueToInclusive",
       count(*)::int                                                 as "count",
       sum("total_sum_of_allocations")::bigint                       as "totalDatacap"
from "allocators_weekly"
         left join "allocator" on "allocators_weekly"."allocator" = "allocator"."id"
where (
    $1 = false -- openDataOnly param $1
        or "allocator" in (select "allocator" from "open_data_pathway_allocator")
    )
  and ("allocator"."is_metaallocator" = false or "allocator"."is_metaallocator" is null)
group by "valueFromExclusive", "valueToInclusive", "week"
order by "week", "valueFromExclusive";
