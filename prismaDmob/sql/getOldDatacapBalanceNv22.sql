with "old_dc_allowance" as (select "addressId"      as "allocator",
                                   sum("allowance") as "total_allowance"
                            from "verifier_allowance"
                            where "height" < 3698160 -- current fil+ edition start
                            group by "addressId"),

     "old_dc_allocations" as (select "verifierAddressId" as "allocator",
                                     sum("allowance")    as "total_allowance"
                              from "verified_client_allowance"
                              where "height" < 3698160 -- current fil+ edition start
                              group by "verifierAddressId")

select "dc_in"."allocator"                                                         as "allocator",
       greatest(0, "dc_in"."total_allowance" - "dc_out"."total_allowance")::bigint as "old_dc_balance"
from "old_dc_allowance" as "dc_in"
         inner join "old_dc_allocations" as "dc_out" using ("allocator");
