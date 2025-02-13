-- this may be a bit imprecise, if SP onboarded >1 client in the first hour of operation.
-- But boost in performance relative to using unified_verified_deal directly is worth it
select distinct on ("provider") "provider",
                                "client" as "first_client"
from "unified_verified_deal_hourly"
order by "provider", "hour";
