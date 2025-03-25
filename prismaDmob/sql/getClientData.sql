select "verified_client"."addressId"         as "addressId",
       "verified_client"."address"           as "address",
       "verified_client"."name"              as "name",
       "verified_client"."orgName"           as "orgName",
       "verified_client"."verifierAddressId" as "verifierAddressId",
       coalesce(
                       json_agg(
                       json_build_object(
                               'addressId', "verified_client_allowance"."addressId",
                               'verifierAddressId', "verified_client_allowance"."verifierAddressId",
                               'allowance', "verified_client_allowance"."allowance",
                               'auditTrail', "verified_client_allowance"."auditTrail",
                               'issueCreateTimestamp', "verified_client_allowance"."issueCreateTimestamp",
                               'createMessageTimestamp', "verified_client_allowance"."createMessageTimestamp"
                       )
                               ) filter (where "verified_client_allowance"."id" is not null), '[]'::json
       ) as "_allowanceArray"
from "verified_client"
         left join "verified_client_allowance"
                   on "verified_client"."addressId" = "verified_client_allowance"."addressId"
where "verified_client"."address" = $1
   or "verified_client"."addressId" = $1
group by "verified_client"."id";
