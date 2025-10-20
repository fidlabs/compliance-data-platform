with "latest_updates" as (select "provider",
                                 max("date") as "date"
                          from "provider_ip_info"
                          group by "provider")
--
select "provider",
       "lat",
       "long",
       "country",
       "region",
       "city"
from "provider_ip_info"
         inner join "latest_updates" using ("provider", "date");
