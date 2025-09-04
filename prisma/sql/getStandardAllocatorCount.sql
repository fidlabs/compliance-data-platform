-- @param {Boolean} $1:openDataOnly
-- @param {DateTime} $2:startDate
-- @param {DateTime} $3:endDate
-- @param {Int} $4:editionId

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
	select * from "active_allocators" where ($4::int is null or "active_allocators"."editionId" = $4)
),
"open_data_pathway_allocator" as (
    select distinct "allocator_id" as "allocator"
    from "allocator_client_bookkeeping"
    where lower("bookkeeping_info"::"jsonb"->'Project'->>'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)') = '[x] i confirm'
       or lower("bookkeeping_info"::"jsonb"->'Project'->>'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)') = 'yes'
)
select count(distinct "allocators_weekly_acc"."allocator")::int as "count"
from "allocators_weekly_acc"
        left join "allocator" on "allocators_weekly_acc"."allocator" = "allocator"."id"
        join "active_in_edition" on "active_in_edition"."allocator_id" = "allocator"."id"
where (
    $1 = false
        or "allocator" in (select "allocator" from "open_data_pathway_allocator")
    )
    and ("is_metaallocator" = false or "is_metaallocator" is null)
    and ($2::date is null or "week" >= $2)
    and ($3::date is null or "week" <= $3)
