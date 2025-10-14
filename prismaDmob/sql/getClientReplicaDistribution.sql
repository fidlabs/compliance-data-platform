WITH
  "replicas" AS (
    SELECT
      'f0' || "clientId" AS "client",
      count(
        DISTINCT "providerId"
      ) AS "num_of_replicas",
      sum(
        "pieceSize"
      ) AS "total_deal_size",
      max(
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
      "client",
      "pieceCid"
  )
SELECT
  "client" AS "client",
  "num_of_replicas"::int AS "num_of_replicas",
  sum(
    "total_deal_size"
  )::bigint AS "total_deal_size",
  sum(
    "piece_size"
  )::bigint AS "unique_data_size"
FROM
  "replicas"
GROUP BY
  "client",
  "num_of_replicas";
