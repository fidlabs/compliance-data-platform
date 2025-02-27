with "allocator_retrievability" as (select "week"                                                                                                       as "week",
                                           "allocator"                                                                                                  as "allocator",
                                           sum("cpd"."total_deal_size" * coalesce("avg_retrievability_success_rate", 0)) / sum("cpd"."total_deal_size") as "avg_weighted_retrievability_success_rate",
                                           sum("cpd"."total_deal_size" * coalesce("avg_retrievability_success_rate_http", 0)) /
                                           sum("cpd"."total_deal_size")                                                                                 as "avg_weighted_retrievability_success_rate_http"
                                    from "client_allocator_distribution_weekly"
                                             inner join "client_provider_distribution_weekly" as "cpd" using ("client", "week")
                                             left join "providers_weekly" using ("provider", "week")
                                    group by "week", "allocator"),
     "allocator_stats" as (select "week"                    as "week",
                                  "allocator"               as "allocator",
                                  count(*)                  as "num_of_clients",
                                  max("sum_of_allocations") as "biggest_client_sum_of_allocations",
                                  sum("sum_of_allocations") as "total_sum_of_allocations"
                           from "client_allocator_distribution_weekly"
                           group by "week", "allocator")
select "week"                                                       as "week",
       "allocator"                                                  as "allocator",
       "num_of_clients"::int                                        as "num_of_clients",
       "biggest_client_sum_of_allocations"::bigint                  as "biggest_client_sum_of_allocations",
       "total_sum_of_allocations"::bigint                           as "total_sum_of_allocations",
       coalesce("avg_weighted_retrievability_success_rate", 0)      as "avg_weighted_retrievability_success_rate",
       coalesce("avg_weighted_retrievability_success_rate_http", 0) as "avg_weighted_retrievability_success_rate_http"
from "allocator_stats"
         left join "allocator_retrievability"
                   using ("week", "allocator");
