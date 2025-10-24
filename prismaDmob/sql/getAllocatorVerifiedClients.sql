select "verified_client"."addressId"         as "addressId",
       "verified_client"."address"           as "address",
       "verified_client"."name"              as "name",
       "verified_client"."orgName"           as "orgName",
       "verified_client"."verifierAddressId" as "verifierAddressId",
       "verified_client"."initialAllowance" - "verified_client"."allowance"      as "usedDatacap", 
       "verified_client"."allowance"                           as "remainingDatacap"
from "verified_client"
where "verified_client"."verifierAddressId" = ANY($1)
and "verified_client"."addressId" is not null and "verified_client"."addressId" != '';

