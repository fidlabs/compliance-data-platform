with "latest_updates" as (select "provider", max("date") as "date"
                          from "provider_ip_info"
                          group by "provider")

select "provider_ip_info"."provider",
       "provider_ip_info"."lat",
       "provider_ip_info"."long",
       "provider_ip_info"."country",
       "provider_ip_info"."region",
       "provider_ip_info"."city"
from "provider_ip_info"
         inner join "latest_updates" using ("provider", "date");
