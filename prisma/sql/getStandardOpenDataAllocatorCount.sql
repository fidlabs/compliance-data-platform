with "open_data_pathway_allocator" as (
    select distinct "allocatorId" as "allocatorId"
    from "allocator_client_bookkeeping"
    where lower("bookkeeping_info"::"jsonb"->'Project'->>'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)') = '[x] i confirm'
       or lower("bookkeeping_info"::"jsonb"->'Project'->>'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)') = 'yes'
)
select count(distinct "allocators_weekly_acc"."allocator")::int as "count"
from "allocators_weekly_acc"
         join "open_data_pathway_allocator" on "allocators_weekly_acc"."allocator" = "open_data_pathway_allocator"."allocatorId"
         left join "allocator" on "allocators_weekly_acc"."allocator" = "allocator"."id"
where "allocator"."is_metaallocator" = false or "allocator"."is_metaallocator" is null;
