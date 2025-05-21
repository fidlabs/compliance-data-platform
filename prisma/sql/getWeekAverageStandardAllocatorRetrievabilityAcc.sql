-- @param {Boolean} $1:openDataOnly
-- @param {Boolean} $2:httpRetrievability
-- @param {DateTime} $3:week

with "open_data_pathway_allocator" as (
    select distinct "allocator_id" as "allocator"
    from "allocator_client_bookkeeping"
    where lower("bookkeeping_info"::"jsonb"->'Project'->>'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)') = '[x] i confirm'
       or lower("bookkeeping_info"::"jsonb"->'Project'->>'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)') = 'yes'
)
select case when $2 = true then avg("avg_weighted_retrievability_success_rate_http") else avg("avg_weighted_retrievability_success_rate") end as "average"
from "allocators_weekly_acc"
         left join "allocator" on "allocators_weekly_acc"."allocator" = "allocator"."id"
where (
    $1 = false
        or "allocator" in (select "allocator" from "open_data_pathway_allocator")
    )
  and ("allocator"."is_metaallocator" = false or "allocator"."is_metaallocator" is null)
  and "week" = $3::timestamp;
