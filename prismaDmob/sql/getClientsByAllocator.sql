-- @param {String} $1:allocatorAddress

select "verified_client"."addressId"         as "addressId",
       "verified_client"."address"           as "address",
       "verified_client"."name"              as "name",
       "verified_client"."orgName"           as "orgName",
       "verified_client"."verifierAddressId" as "verifierAddressId",
       coalesce(
                       jsonb_agg(
                       jsonb_build_object(
                               'addressId', "verified_client_allowance"."addressId",
                               'verifierAddressId', "verified_client_allowance"."verifierAddressId",
                               'allowance', "verified_client_allowance"."allowance",
                               'auditTrail', "verified_client_allowance"."auditTrail",
                               'issueCreateTimestamp', "verified_client_allowance"."issueCreateTimestamp",
                               'createMessageTimestamp', "verified_client_allowance"."createMessageTimestamp"
                       )
                               ), '[]'::jsonb
       ) as "_allowanceArray"
from "verified_client"
         left join "verified_client_allowance"
                   on "verified_client"."addressId" = "verified_client_allowance"."addressId"
                       and "verified_client"."verifierAddressId" = "verified_client_allowance"."verifierAddressId"
where upper("verified_client"."verifierAddressId") = upper($1)
and "verified_client"."addressId" is not null and "verified_client"."addressId" != ''
group by "verified_client"."id";
