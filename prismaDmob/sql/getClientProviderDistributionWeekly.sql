WITH
  "miner_pieces" AS (
    SELECT
      date_trunc(
        'week',
        to_timestamp(
          "termStart" * 30 + 1598306400
        )
      ) AS "week",
      'f0' || "clientId" AS "client",
      'f0' || "providerId" AS "provider",
      "pieceCid" AS "pieceCid",
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
      AND to_timestamp(
        "termStart" * 30 + 1598306400
      ) <= current_timestamp -- deals that didn't start yet
    GROUP BY
      "week",
      "client",
      "provider",
      "pieceCid"
  )
SELECT
  "week" AS "week",
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
  "week",
  "client",
  "provider";
