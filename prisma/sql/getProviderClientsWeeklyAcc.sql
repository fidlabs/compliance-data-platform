-- @param {DateTime} $1:startDate
-- @param {DateTime} $2:endDate

with "clients_per_provider" as (select "week"                   as "week",
                                       count(distinct "client") as "clientsCount",
                                       sum("total_deal_size")   as "totalDatacap"
                                from "client_provider_distribution_weekly_acc"
                                WHERE ($1::date is null or "week" >= $1) and ($2::date is null or "week" <= $2)
                                group by "provider", "week")
--
select "week"                      as "week",
       ("clientsCount" - 1)::int   as "valueFromExclusive",
       "clientsCount"::int         as "valueToInclusive",
       count(*)::int               as "count",
       sum("totalDatacap")::bigint as "totalDatacap"
from "clients_per_provider"
group by "valueFromExclusive", "valueToInclusive", "week"
order by "week", "valueFromExclusive";
