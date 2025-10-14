WITH
  "nv22_unified_verified_deal" AS (
    SELECT
      "clientId" AS "clientId",
      "pieceCid" AS "pieceCid",
      "pieceSize" AS "pieceSize"
    FROM
      "unified_verified_deal"
    WHERE
      "termStart" >= 3698160 -- current fil+ edition start
      AND to_timestamp(
        "termStart" * 30 + 1598306400
      ) <= current_timestamp -- deals that didn't start yet
  ),
  "cids" AS (
    SELECT DISTINCT
      "clientId" AS "clientId",
      "pieceCid" AS "pieceCid"
    FROM
      "nv22_unified_verified_deal"
  )
SELECT
  'f0' || "cids"."clientId" AS "client",
  'f0' || "other_dc"."clientId" AS "other_client",
  sum(
    "other_dc"."pieceSize"
  )::bigint AS "total_deal_size",
  count(
    DISTINCT "other_dc"."pieceCid"
  )::int AS "unique_cid_count"
FROM
  "cids"
  JOIN "nv22_unified_verified_deal" "other_dc" ON "cids"."pieceCid" = "other_dc"."pieceCid"
  AND "cids"."clientId" != "other_dc"."clientId"
GROUP BY
  "client",
  "other_client";
