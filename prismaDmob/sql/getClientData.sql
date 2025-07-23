-- @param {String} $1:clientIdOrAddress

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
where upper("verified_client"."address") = upper($1)
   or upper("verified_client"."addressId") = upper($1)
group by "verified_client"."id";
