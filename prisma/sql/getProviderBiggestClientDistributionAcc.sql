with "providers_with_ratio" as (select "week"                                          as "week",
                                       "provider"                                      as "provider",
                                       max("total_deal_size") / sum("total_deal_size") as "biggestToTotalRatio",
                                       sum("total_deal_size")                          as "totalDatacap"
                                from "client_provider_distribution_weekly_acc"
                                group by "provider", "week")
select "week"                                                  as "week",
       100 * ceil("biggestToTotalRatio"::float8 * 20) / 20 - 5 as "valueFromExclusive",
       100 * ceil("biggestToTotalRatio"::float8 * 20) / 20     as "valueToInclusive",
       count(*)::int                                           as "count",
       sum("totalDatacap")::float                              as "totalDatacap"
from "providers_with_ratio"
group by "valueFromExclusive", "valueToInclusive", "week"
order by "week", "valueFromExclusive";
