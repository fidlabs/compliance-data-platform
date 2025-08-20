-- @param {DateTime} $1:startDate
-- @param {DateTime} $2:endDate

with "with_week" as (select "date",
                            "ok",
                            "misreporting",
                            "not_reporting",
                            "total",
                            date_trunc('week', "date") as "week"
                    from "ipni_reporting_daily"
                    where ($1::date is null or "date" >= $1) and ($2::date is null or "date" <= $2)
)
select distinct on ("week") "week",
                            "ok",
                            "not_reporting",
                            "misreporting",
                            "total"
from "with_week"
order by "week", "date" desc;
