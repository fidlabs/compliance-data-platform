WITH
  "miner_info" AS (
    SELECT
      "unified_verified_deal"."providerId" AS "provider",
      count(*) AS "num_of_deals",
      "unified_verified_deal"."clientId" AS "client",
      coalesce(
        sum(
          "unified_verified_deal"."pieceSize"
        ),
        0
      ) AS "total_deal_size",
      coalesce(
        max(
          "unified_verified_deal"."termStart"
        ),
        0
      ) AS "last_deal_height"
    FROM
      "unified_verified_deal"
    WHERE
      "unified_verified_deal"."sectorId" <> '0'
    GROUP BY
      "unified_verified_deal"."clientId",
      "unified_verified_deal"."providerId"
  )
SELECT
  'f0' || "unique_providers"."providerId" AS "id",
  coalesce(
    sum(
      "miner_info"."num_of_deals"
    ),
    0
  )::int AS "num_of_deals",
  coalesce(
    sum(
      "miner_info"."total_deal_size"
    ),
    0
  )::bigint AS "total_deal_size",
  count(
    "miner_info"."client"
  )::int AS "num_of_clients",
  coalesce(
    max(
      "miner_info"."last_deal_height"
    ),
    0
  )::int AS "last_deal_height"
FROM
  "unique_providers"
  LEFT JOIN "miner_info" ON "unique_providers"."providerId" = "miner_info"."provider"
GROUP BY
  "unique_providers"."providerId";
