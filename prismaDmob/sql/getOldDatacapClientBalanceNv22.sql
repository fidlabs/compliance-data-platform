WITH
  "old_dc_allowance" AS (
    SELECT
      "addressId" AS "client",
      sum(
        "allowance"
      ) AS "total_allowance"
    FROM
      "verified_client_allowance"
    WHERE
      "height" < 3698160 -- current fil+ edition start
    GROUP BY
      "addressId"
  ),
  "old_dc_claims" AS (
    SELECT
      'f0' || "clientId" AS "client",
      sum(
        "pieceSize"
      ) AS "total_claims"
    FROM
      "unified_verified_deal"
    WHERE
      "termStart" < 3698160 -- current fil+ edition start
    GROUP BY
      "clientId"
  )
SELECT
  "client" AS "client",
  greatest(
    0,
    (
      "dc_in"."total_allowance" - coalesce(
        "dc_out"."total_claims",
        0
      )
    )
  )::bigint AS "old_dc_balance"
FROM
  "old_dc_allowance" AS "dc_in"
  LEFT JOIN "old_dc_claims" AS "dc_out" USING (
    "client"
  );
