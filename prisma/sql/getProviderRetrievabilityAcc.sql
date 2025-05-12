select "week"                                                      as "week",
       100 * ceil("avg_retrievability_success_rate" * 20) / 20 - 5 as "valueFromExclusive",
       100 * ceil("avg_retrievability_success_rate" * 20) / 20     as "valueToInclusive",
       count(*)::int                                               as "count",
       sum("total_deal_size")::bigint                              as "totalDatacap"
from "providers_weekly_acc"
group by "valueFromExclusive", "valueToInclusive", "week"
order by "week", "valueFromExclusive";
