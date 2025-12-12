select "verified_client"."addressId"                                                                                  as "addressId",
       "verified_client"."address"                                                                                    as "address",
       case when "verified_client"."name" = 'n/a' then null else nullif(trim("verified_client"."name"), '') end       as "name",
       case when "verified_client"."orgName" = 'n/a' then null else nullif(trim("verified_client"."orgName"), '') end as "orgName",
       "verified_client"."verifierAddressId"                                                                          as "verifierAddressId",
       "verified_client"."initialAllowance" - "verified_client"."allowance"                                           as "usedDatacap",
       "verified_client"."allowance"                                                                                  as "remainingDatacap"
from "verified_client"
         left join "client_contract"
                   on "verified_client"."addressId" = "client_contract"."addressId"
where "verified_client"."verifierAddressId" = any ($1)
  and "verified_client"."addressId" is not null
  and "verified_client"."addressId" != ''
  and "client_contract"."id" is null;
