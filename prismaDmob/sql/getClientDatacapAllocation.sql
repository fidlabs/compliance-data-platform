SELECT
  "id" AS "id",
  "addressId" AS "client_id",
  "verifierAddressId" AS "allocator_id",
  "allowance" AS "allocation",
  to_timestamp(
    "height" * 30 + 1598306400
  ) AS "timestamp"
FROM
  "verified_client_allowance"
WHERE
  "height" >= 3698160;

-- current fil+ edition start
