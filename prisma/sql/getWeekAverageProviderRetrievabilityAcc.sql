-- @param {Boolean} $1:openDataOnly
-- @param {Boolean} $2:httpRetrievability
-- @param {DateTime} $3:week

with "open_data_pathway_provider" as (
    select distinct "provider" as "provider"
    from "allocator_client_bookkeeping"
       join "client_provider_distribution" on "allocator_client_bookkeeping"."client_id" = "client_provider_distribution"."client"
    where lower("bookkeeping_info"::"jsonb"->'Project'->>'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)') = '[x] i confirm'
       or lower("bookkeeping_info"::"jsonb"->'Project'->>'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)') = 'yes'
    AND ($4::text[] IS NULL OR "allocator_client_bookkeeping"."allocator_id" = ANY($4::text[]))
)
select case when $2 = true then avg("avg_retrievability_success_rate_http") else avg("avg_retrievability_success_rate") end as "average"
from "providers_weekly_acc"
where (
    $1 = false
        or "provider" in (select "provider" from "open_data_pathway_provider")
    )
  and "week" = $3::timestamp;
