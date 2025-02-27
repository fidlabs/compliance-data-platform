with "miner_pieces" as (select 'f0' || "clientId"       as "client",
                               'f0' || "providerId"     as "provider",
                               "pieceCid"               as "pieceCid",
                               sum("pieceSize")         as "total_deal_size",
                               min("pieceSize")         as "piece_size",
                               count(*)                 as "claims_count"
                        from "unified_verified_deal"
                        where "termStart" >= 3847920                                           -- nv22 start
                          and to_timestamp("termStart" * 30 + 1598306400) <= current_timestamp -- deals that didn't start yet
                        group by "client", "provider", "pieceCid")
select "client"                       as "client",
       "provider"                     as "provider",
       sum("total_deal_size")::bigint as "total_deal_size",
       sum("piece_size")::bigint      as "unique_data_size",
       sum("claims_count")::bigint    as "claims_count"
from "miner_pieces"
group by "client", "provider";
