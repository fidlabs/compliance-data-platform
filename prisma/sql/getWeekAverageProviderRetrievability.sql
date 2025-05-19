with "open_data_pathway_provider" as (
    select distinct "client_provider_distribution"."provider" as "provider"
    from "allocator_client_bookkeeping"
       join "client_provider_distribution" on "allocator_client_bookkeeping"."clientId" = "client_provider_distribution"."client"
    where lower("bookkeeping_info"::"jsonb"->'Project'->>'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)') = '[x] i confirm'
       or lower("bookkeeping_info"::"jsonb"->'Project'->>'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)') = 'yes'
)
select avg("avg_retrievability_success_rate") as "average"
from "providers_weekly"
where (
    $1 = false -- openDataOnly param $1
        or "provider" in (select "provider" from "open_data_pathway_provider")
    )
  and "week" = $2; -- week param $2
