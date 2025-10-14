-- @param {DateTime} $1:week
WITH
  "miner_pieces" AS (
    SELECT
      "pieceCid" AS "piece_cid",
      'f0' || "clientId" AS client,
      'f0' || "providerId" AS provider,
      sum(
        "pieceSize"
      ) AS "total_deal_size",
      min(
        "pieceSize"
      ) AS "piece_size"
    FROM
      "unified_verified_deal"
    WHERE
      "termStart" >= 3698160 -- current fil+ edition start
      AND date_trunc(
        'week',
        to_timestamp(
          "termStart" * 30 + 1598306400
        )
      ) <= $1 -- deals up to provided week
    GROUP BY
      "pieceCid",
      "clientId",
      "providerId"
  )
SELECT
  "client" AS "client",
  "provider" AS "provider",
  sum(
    "total_deal_size"
  )::bigint AS "total_deal_size",
  sum(
    "piece_size"
  )::bigint AS "unique_data_size"
FROM
  "miner_pieces"
GROUP BY
  "client",
  "provider";
