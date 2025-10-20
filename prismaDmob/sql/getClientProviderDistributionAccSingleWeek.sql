-- @param {DateTime} $1:week

with "miner_pieces" as (select "pieceCid"           as "piece_cid",
                               'f0' || "clientId"   as client,
                               'f0' || "providerId" as provider,
                               sum("pieceSize")     as "total_deal_size",
                               min("pieceSize")     as "piece_size"
                        from "unified_verified_deal"
                        where "termStart" >= 3698160                                                -- current fil+ edition start
                          and date_trunc('week', to_timestamp("termStart" * 30 + 1598306400)) <= $1 -- deals up to provided week
                        group by "pieceCid", "clientId", "providerId")
select "client"                       as "client",
       "provider"                     as "provider",
       sum("total_deal_size")::bigint as "total_deal_size",
       sum("piece_size")::bigint      as "unique_data_size"
from "miner_pieces"
group by "client", "provider";
