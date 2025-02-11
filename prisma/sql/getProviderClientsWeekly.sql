with clients_per_provider as (select week                   as "week",
                                     count(distinct client) as clients_count,
                                     sum(total_deal_size)   as "totalDatacap"
                              from client_provider_distribution_weekly
                              group by provider, week)
select week                       as "week",
       (clients_count - 1)::float as "valueFromExclusive",
       clients_count::float       as "valueToInclusive",
       count(*)::int              as "count",
       sum("totalDatacap")::float as "totalDatacap"
from clients_per_provider
group by "valueFromExclusive", "valueToInclusive", week
order by week, "valueFromExclusive";
