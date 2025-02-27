with "distributions" as (select date_trunc('week', to_timestamp("height" * 30 + 1598306400)) as "week",
                                "addressId"                                                  as "client",
                                "verifierAddressId"                                          as "allocator",
                                count(*)                                                     as "num_of_allocations",
                                sum("allowance")                                             as "sum_of_allocations"
                         from "verified_client_allowance"
                         where "height" >= 3847920 -- nv22 start
                         group by "week", "client", "allocator"),
     "weeks" as (select date_trunc('week', "dates") "week"
                 from generate_series(
                              to_timestamp(3847920 * 30 + 1598306400),
                              current_timestamp,
                              '1 week'::interval) "dates")
select "weeks"."week"                    as "week",
       "client"                          as "client",
       "allocator"                       as "allocator",
       sum("num_of_allocations")::int    as "num_of_allocations",
       sum("sum_of_allocations")::bigint as "sum_of_allocations"
from "weeks"
         inner join "distributions"
                    on "weeks"."week" >= "distributions"."week"
group by "weeks"."week", "client", "allocator";
