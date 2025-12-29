-- @param {String} $1:dataType
-- @param {DateTime} $2:startDate
-- @param {DateTime} $3:endDate

with "open_data_pathway_provider" as (
    select distinct "provider" as "provider"
    from "allocator_client_bookkeeping"
       join "client_provider_distribution" on "allocator_client_bookkeeping"."client_id" = "client_provider_distribution"."client"
    where lower(
                  "allocator_client_bookkeeping"."bookkeeping_info"::jsonb->'Project'->>'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)'
          ) in ('[x] i confirm', 'yes'))
--
select count(distinct "provider")::int as "count"
from "providers_weekly_acc"
    left join "open_data_pathway_provider" using ("provider")
where (($1 = 'openData' and "open_data_pathway_provider"."provider" is not null) or
       ($1 = 'enterprise' and "open_data_pathway_provider"."provider" is null) or
       ($1 is null))
  and ($2::date is null or "week" >= $2)
  and ($3::date is null or "week" <= $3)
