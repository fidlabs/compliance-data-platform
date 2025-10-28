with "provider_retrievability_weekly" as (select "prd"."week"                                                                 as "week",
                                                 "prd"."provider"                                                             as "provider",
                                                 sum("prd"."total")                                                           as "total",
                                                 sum("prd"."successful")                                                      as "successful",
                                                 sum("prd"."successful"::float) / sum("prd"."total"::float)                   as "success_rate",
                                                 sum(coalesce("prd"."successful_http", 0))                                    as "successful_http",
                                                 sum(coalesce("prd"."successful_http", 0)::float) / sum("prd"."total"::float) as "success_rate_http",
                                                 coalesce(
                                                         (select "puf"."success_rate"
                                                          from "provider_url_finder_retrievability_daily" "puf"
                                                          where "puf"."provider" = "prd"."provider"
                                                            and date_trunc('week', "puf"."date") = "prd"."week"
                                                          order by "puf"."date" desc
                                                          limit 1), 0
                                                 )                                                                            as "success_rate_url_finder"
--
                                          from (select date_trunc('week', "date") as "week",
                                                       "provider"                 as "provider",
                                                       "total"                    as "total",
                                                       "successful"               as "successful",
                                                       "successful_http"          as "successful_http"
                                                from "provider_retrievability_daily") as "prd"
                                          group by "prd"."week", "prd"."provider")
--
select coalesce("prw"."week", date_trunc('week', "cpw"."week")) as "week",
       "cpw"."provider"                                         as "provider",
       count(*)::int                                            as "num_of_clients",
       max("cpw"."total_deal_size")::bigint                     as "biggest_client_total_deal_size",
       sum("cpw"."total_deal_size")::bigint                     as "total_deal_size",
       max(coalesce("prw"."success_rate", 0))                   as "avg_retrievability_success_rate",
       max(coalesce("prw"."success_rate_http", 0))              as "avg_retrievability_success_rate_http",
       max(coalesce("prw"."success_rate_url_finder", 0))        as "avg_retrievability_success_rate_url_finder"
from "client_provider_distribution_weekly_acc" "cpw"
         left join "provider_retrievability_weekly" "prw"
                   on date_trunc('week', "cpw"."week") = "prw"."week" and "cpw"."provider" = "prw"."provider"
group by coalesce("prw"."week", date_trunc('week', "cpw"."week")), "cpw"."provider";
