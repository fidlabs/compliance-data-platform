-- @param {String} $1:allocatorAddress
SELECT
  "verified_client"."addressId" AS "addressId",
  "verified_client"."address" AS "address",
  "verified_client"."name" AS "name",
  "verified_client"."orgName" AS "orgName",
  "verified_client"."verifierAddressId" AS "verifierAddressId",
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'addressId',
        "verified_client_allowance"."addressId",
        'verifierAddressId',
        "verified_client_allowance"."verifierAddressId",
        'allowance',
        "verified_client_allowance"."allowance",
        'auditTrail',
        "verified_client_allowance"."auditTrail",
        'issueCreateTimestamp',
        "verified_client_allowance"."issueCreateTimestamp",
        'createMessageTimestamp',
        "verified_client_allowance"."createMessageTimestamp"
      )
    ),
    '[]'::jsonb
  ) AS "_allowanceArray"
FROM
  "verified_client"
  LEFT JOIN "verified_client_allowance" ON "verified_client"."addressId" = "verified_client_allowance"."addressId"
  AND "verified_client"."verifierAddressId" = "verified_client_allowance"."verifierAddressId"
WHERE
  upper(
    "verified_client"."verifierAddressId"
  ) = upper($1)
  AND "verified_client"."addressId" IS NOT NULL
  AND "verified_client"."addressId" != ''
GROUP BY
  "verified_client"."id";
