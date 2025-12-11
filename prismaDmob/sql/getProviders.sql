with "miner_info" as (select "unified_verified_deal"."providerId"                  as "provider",
                             count(*)                                              as "num_of_deals",
                             "unified_verified_deal"."clientId"                    as "client",
                             coalesce(sum("unified_verified_deal"."pieceSize"), 0) as "total_deal_size",
                             coalesce(max("unified_verified_deal"."termStart"), 0) as "last_deal_height",
                             coalesce(min("unified_verified_deal"."termStart"), 0) as "first_deal_height"
                      from "unified_verified_deal"
                      where "unified_verified_deal"."sectorId" <> '0'
                      group by "unified_verified_deal"."clientId", "unified_verified_deal"."providerId")
select 'f0' || "unique_providers"."providerId"                  as "id",
       coalesce(sum("miner_info"."num_of_deals"), 0)::int       as "num_of_deals",
       coalesce(sum("miner_info"."total_deal_size"), 0)::bigint as "total_deal_size",
       count("miner_info"."client")::int                        as "num_of_clients",
       coalesce(max("miner_info"."last_deal_height"), 0)::int   as "last_deal_height",
       coalesce(min("miner_info"."first_deal_height"), 0)::int   as "first_deal_height"
from "unique_providers"
      left join "miner_info" on "unique_providers"."providerId" = "miner_info"."provider"
group by "unique_providers"."providerId";
