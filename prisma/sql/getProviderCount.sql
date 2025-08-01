-- @param {Boolean} $1:openDataOnly
-- @param {DateTime} $2:startDate
-- @param {DateTime} $3:endDate

with "open_data_pathway_provider" as (
    select distinct "provider" as "provider"
    from "allocator_client_bookkeeping"
       join "client_provider_distribution" on "allocator_client_bookkeeping"."client_id" = "client_provider_distribution"."client"
    where lower("bookkeeping_info"::"jsonb"->'Project'->>'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)') = '[x] i confirm'
       or lower("bookkeeping_info"::"jsonb"->'Project'->>'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)') = 'yes'
)
select count(distinct "provider")::int as "count"
from "providers_weekly_acc"
where (
          $1 = false
              or "provider" in (select "provider" from "open_data_pathway_provider")
          )
and "week" >= $2
and "week" <= $3;
    
