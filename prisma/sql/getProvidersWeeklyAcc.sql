with "provider_retrievability_weekly" as (select distinct on ("puf"."provider", date_trunc('week', "puf"."date")) date_trunc('week', "puf"."date") as "week",
                                                                                                                  "puf"."provider"                 as "provider",
                                                                                                                  "puf"."success_rate"             as "success_rate_url_finder"
                                          from "provider_url_finder_retrievability_daily" "puf"
                                          order by "puf"."provider", date_trunc('week', "puf"."date"), "puf"."date" desc)
select coalesce("prw"."week", date_trunc('week', "cpwa"."week")) as "week",
       "cpwa"."provider"                                         as "provider",
       count(*)::int                                             as "num_of_clients",
       max("cpwa"."total_deal_size")::bigint                     as "biggest_client_total_deal_size",
       sum("cpwa"."total_deal_size")::bigint                     as "total_deal_size",
       max(coalesce("prw"."success_rate_url_finder", 0))         as "avg_retrievability_success_rate_url_finder"
from "client_provider_distribution_weekly_acc" "cpwa"
         left join "provider_retrievability_weekly" "prw"
                   on "prw"."week" = date_trunc('week', "cpwa"."week")
                       and "prw"."provider" = "cpwa"."provider"
group by coalesce("prw"."week", date_trunc('week', "cpwa"."week")), "cpwa"."provider";
