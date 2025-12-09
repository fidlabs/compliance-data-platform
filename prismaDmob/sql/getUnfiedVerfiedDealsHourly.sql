SELECT date_trunc('hour', to_timestamp("termStart" * 30 + 1598306400)) AS "hour",
       'f0' || "clientId" AS "client",
       'f0' || "providerId" AS "provider",
       COUNT(*)::INT AS "num_of_claims",
       (COUNT(*) FILTER (
                         WHERE "dealId" = 0))::INT AS "num_of_ddo_claims",
       SUM("pieceSize")::BIGINT AS "total_deal_size",
       COALESCE(SUM("pieceSize") FILTER (
                                         WHERE "dealId" = 0), 0)::BIGINT AS "total_ddo_deal_size"
FROM "unified_verified_deal"
WHERE "termStart" >= 3698160 -- current fil+ edition start

  AND to_timestamp("termStart" * 30 + 1598306400) <= CURRENT_TIMESTAMP -- deals that didn't start yet
GROUP BY "hour",
         "client",
         "provider";