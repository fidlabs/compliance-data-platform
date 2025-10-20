-- @param {String} $1:clientId?
-- @param {String} $2:allocatorId?

with "allocation_first_deal" as (select "client_id"                                       as "client_id",
                                        "allocator_id"                                    as "allocator_id",
                                        "timestamp"                                       as "allocation_timestamp",
                                        min("hour") filter ( where "hour" >= "timestamp") as "first_deal_timestamp"
                                 from "client_datacap_allocation"
                                          left join "unified_verified_deal_hourly" on "client_datacap_allocation"."client_id" = "unified_verified_deal_hourly"."client"
                                 group by "client_id", "allocator_id", "timestamp"),
--
     "allocation_seconds_to_first_deal" as (select *,
                                             extract(epoch from ("first_deal_timestamp" - "allocation_timestamp")) as "seconds_to_first_deal"
                                      from "allocation_first_deal"
                                      where (upper("client_id") = upper($1) or $1 is null)
                                        and (upper("allocator_id") = upper($2) or $2 is null))
--
select avg("seconds_to_first_deal") as "average"
from "allocation_seconds_to_first_deal";
