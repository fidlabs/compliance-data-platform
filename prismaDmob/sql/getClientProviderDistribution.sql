WITH
  "miner_pieces" AS (
    SELECT
      'f0' || "clientId" AS "client",
      'f0' || "providerId" AS "provider",
      "pieceCid" AS "pieceCid",
      sum(
        "pieceSize"
      ) AS "total_deal_size",
      min(
        "pieceSize"
      ) AS "piece_size",
      count(*) AS "claims_count"
    FROM
      "unified_verified_deal"
    WHERE
      "termStart" >= 3698160 -- current fil+ edition start
      AND to_timestamp(
        "termStart" * 30 + 1598306400
      ) <= current_timestamp -- deals that didn't start yet
    GROUP BY
      "client",
      "provider",
      "pieceCid"
  )
SELECT
  "client" AS "client",
  "provider" AS "provider",
  sum(
    "total_deal_size"
  )::bigint AS "total_deal_size",
  sum(
    "piece_size"
  )::bigint AS "unique_data_size",
  sum(
    "claims_count"
  )::bigint AS "claims_count"
FROM
  "miner_pieces"
GROUP BY
  "client",
  "provider";
