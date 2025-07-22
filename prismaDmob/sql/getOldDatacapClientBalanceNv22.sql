with "old_dc_allowance" as (select "addressId"      as "client",
                                   sum("allowance") as "total_allowance"
                            from "verified_client_allowance"
                            where "height" < 3698160 -- current fil+ edition start
                            group by "addressId"),

     "old_dc_claims" as (select 'f0' || "clientId" as "client", sum("pieceSize") as "total_claims"
                         from "unified_verified_deal"
                         where "termStart" < 3698160 -- current fil+ edition start
                         group by "clientId")

select "client"                                                                                as "client",
       greatest(0, ("dc_in"."total_allowance" - coalesce("dc_out"."total_claims", 0)))::bigint as "old_dc_balance"
from "old_dc_allowance" as "dc_in"
         left join "old_dc_claims" as "dc_out" using ("client");
