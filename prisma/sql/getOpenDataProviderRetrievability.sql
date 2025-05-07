with "open_data_pathway_provider" as (
    select distinct "client_provider_distribution"."provider" as "provider"
    from "allocator_client_bookkeeping"
       join "client_provider_distribution" on "allocator_client_bookkeeping"."clientId" = "client_provider_distribution"."client"
    where lower("bookkeeping_info"::"jsonb"->'Project'->>'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)') = '[x] i confirm'
       or lower("bookkeeping_info"::"jsonb"->'Project'->>'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)') = 'yes'
)
select "week"                                                      as "week",
       100 * ceil("avg_retrievability_success_rate" * 20) / 20 - 5 as "valueFromExclusive",
       100 * ceil("avg_retrievability_success_rate" * 20) / 20     as "valueToInclusive",
       count(*)::int                                               as "count",
       sum("total_deal_size")::bigint                              as "totalDatacap"
from "providers_weekly"
         join "open_data_pathway_provider" on "providers_weekly"."provider" = "open_data_pathway_provider"."provider"
group by "valueFromExclusive", "valueToInclusive", "week"
order by "week", "valueFromExclusive";
