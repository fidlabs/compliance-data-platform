WITH
  "old_dc_allowance" AS (
    SELECT
      "addressId" AS "allocator",
      sum(
        "allowance"
      ) AS "total_allowance"
    FROM
      "verifier_allowance"
    WHERE
      "height" < 3698160 -- current fil+ edition start
    GROUP BY
      "addressId"
  ),
  "old_dc_allocations" AS (
    SELECT
      "verifierAddressId" AS "allocator",
      sum(
        "allowance"
      ) AS "total_allowance"
    FROM
      "verified_client_allowance"
    WHERE
      "height" < 3698160 -- current fil+ edition start
    GROUP BY
      "verifierAddressId"
  )
SELECT
  "dc_in"."allocator" AS "allocator",
  greatest(
    0,
    "dc_in"."total_allowance" - "dc_out"."total_allowance"
  )::bigint AS "old_dc_balance"
FROM
  "old_dc_allowance" AS "dc_in"
  INNER JOIN "old_dc_allocations" AS "dc_out" USING (
    "allocator"
  );
