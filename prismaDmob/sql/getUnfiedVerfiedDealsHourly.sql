select date_trunc('hour', to_timestamp("termStart" * 30 + 1598306400))   as "hour",
       'f0' || "clientId"                                                as "client",
       'f0' || "providerId"                                              as "provider",
       count(*)::int                                                     as "num_of_claims",
       (count(*) filter (where "dealId" = 0))::int                       as "num_of_ddo_claims",
       sum("pieceSize")::bigint                                          as "total_deal_size",
       coalesce(sum("pieceSize") filter (where "dealId" = 0), 0)::bigint as "total_ddo_deal_size"
from "unified_verified_deal"
where "termStart" >= 3698160                                           -- current fil+ edition start
  and to_timestamp("termStart" * 30 + 1598306400) <= current_timestamp -- deals that didn't start yet
group by "hour", "client", "provider";
