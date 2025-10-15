-- @param {Boolean} $1:openDataOnly
-- @param {String} $2:retrievabilityType
-- @param {DateTime} $3:startDate
-- @param {DateTime} $4:endDate
with "open_data_pathway_provider" as (
    select distinct "provider" as "provider"
    from "allocator_client_bookkeeping"
        join "client_provider_distribution" on "allocator_client_bookkeeping"."client_id" = "client_provider_distribution"."client"
    where lower(
            "bookkeeping_info"::"jsonb"->'Project'->>'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)'
        ) = '[x] i confirm'
        or lower(
            "bookkeeping_info"::"jsonb"->'Project'->>'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)'
        ) = 'yes'
),
"provider_weekly" as (
    select "week" as "week",
        "provider" as "provider",
        "total_deal_size" as "total_deal_size",
        case
            when $2 = 'http' then "avg_retrievability_success_rate_http"
            when $2 = 'urlFinder' then "avg_retrievability_success_rate_url_finder"
            else "avg_retrievability_success_rate"
        end as "selected_retrievability"
    from "providers_weekly_acc"
    where (
            $3::date is null
            or "week" >= $3
        )
        and (
            $4::date is null
            or "week" <= $4
        )
)
select "week" as "week",
    100 * ceil("selected_retrievability" * 20) / 20 - 5 as "valueFromExclusive",
    100 * ceil("selected_retrievability" * 20) / 20 as "valueToInclusive",
    count(*)::int as "count",
    sum("total_deal_size")::bigint as "totalDatacap"
from "provider_weekly"
where (
        $1 = false
        or "provider" in (
            select "provider"
            from "open_data_pathway_provider"
        )
    )
group by "week",
    "valueFromExclusive",
    "valueToInclusive"
order by "week",
    "valueFromExclusive";