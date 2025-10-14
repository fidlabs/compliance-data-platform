-- @param {String} $1:clientId?
-- @param {String} $2:allocatorId?
WITH
  "allocation_first_deal" AS (
    SELECT
      "client_id" AS "client_id",
      "allocator_id" AS "allocator_id",
      "timestamp" AS "allocation_timestamp",
      min("hour") FILTER (
        WHERE
          "hour" >= "timestamp"
      ) AS "first_deal_timestamp"
    FROM
      "client_datacap_allocation"
      LEFT JOIN "unified_verified_deal_hourly" ON "client_datacap_allocation"."client_id" = "unified_verified_deal_hourly"."client"
    GROUP BY
      "client_id",
      "allocator_id",
      "timestamp"
  ),
  "allocation_seconds_to_first_deal" AS (
    SELECT
      *,
      extract(
        epoch
        FROM
          (
            "first_deal_timestamp" - "allocation_timestamp"
          )
      ) AS "seconds_to_first_deal"
    FROM
      "allocation_first_deal"
    WHERE
      (
        upper(
          "client_id"
        ) = upper($1)
        OR $1 IS NULL
      )
      AND (
        upper(
          "allocator_id"
        ) = upper($2)
        OR $2 IS NULL
      )
  )
SELECT
  avg(
    "seconds_to_first_deal"
  ) AS "average"
FROM
  "allocation_seconds_to_first_deal";
