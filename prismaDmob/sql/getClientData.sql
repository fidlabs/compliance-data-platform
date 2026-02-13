-- @param {String} $1:clientIdOrAddress
-- @param {Boolean} $2:includeAllowanceArray

SELECT
    vc."addressId",
    vc."address",
    CASE WHEN vc."name" = 'n/a' THEN NULL ELSE NULLIF(TRIM(vc."name"), '') END AS "name",
    CASE WHEN vc."orgName" = 'n/a' THEN NULL ELSE NULLIF(TRIM(vc."orgName"), '') END AS "orgName",
    vc."verifierAddressId",
    COALESCE(a."_allowanceArray", '[]'::jsonb) AS "_allowanceArray"
FROM "verified_client" vc

LEFT JOIN LATERAL (
    SELECT jsonb_agg(
               jsonb_build_object(
                   'addressId', vca."addressId",
                   'verifierAddressId', vca."verifierAddressId",
                   'allowance', vca."allowance",
                   'auditTrail', vca."auditTrail",
                   'issueCreateTimestamp', vca."issueCreateTimestamp",
                   'createMessageTimestamp', vca."createMessageTimestamp"
               )
           ) AS "_allowanceArray"
    FROM "verified_client_allowance" vca
    WHERE vca."addressId" = vc."addressId"
      AND $2 = true
) a ON true

WHERE upper(vc."address") = upper($1)
   OR upper(vc."addressId") = upper($1);