with "nv22_unified_verified_deal" as (select "clientId"  as "clientId",
                                             "pieceCid"  as "pieceCid",
                                             "pieceSize" as "pieceSize"
                                      from "unified_verified_deal"
                                      where "termStart" >= 3698160 -- current fil+ edition start
                                        and to_timestamp("termStart" * 30 + 1598306400) <= current_timestamp -- deals that didn't start yet
),
     "cids" as (select distinct "clientId" as "clientId",
                                "pieceCid" as "pieceCid"
                from "nv22_unified_verified_deal")
select 'f0' || "cids"."clientId"                          as "client",
       'f0' || "other_dc"."clientId"                      as "other_client",
       sum("other_dc"."pieceSize")::bigint                as "total_deal_size",
       count(distinct "other_dc"."pieceCid")::int         as "unique_cid_count"
from "cids"
         join "nv22_unified_verified_deal" "other_dc"
              on
                  "cids"."pieceCid" = "other_dc"."pieceCid"
                      and "cids"."clientId" != "other_dc"."clientId"
group by "client", "other_client";
