select 
    "providerId" as "provider",
    count(*)::int as "amount_of_terminated_deals"
from "unified_verified_deal"
where "unified_verified_deal"."providerId" = any($1)
    and "unified_verified_deal"."slashedEpoch" != 0
group by "unified_verified_deal"."providerId";