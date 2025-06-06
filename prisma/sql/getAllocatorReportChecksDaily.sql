-- @param {DateTime} $1:week

with "checks_daily" as (select count(distinct "check") filter ( where "result" = true)  as "checksPassedCount",
                               count(distinct "check") filter ( where "result" = false) as "checksFailedCount",
                               date_trunc('day', "allocator_report"."create_date")      as "day"
                        from "allocator_report_check_result"
                                 join "allocator_report" on "allocator_report_check_result"."allocator_report_id" = "allocator_report"."id"
                        where date_trunc('week', "allocator_report"."create_date") = $1
                        group by "allocator", "day")
select sum("checksPassedCount")::int as "checksPassedCount",
       sum("checksFailedCount")::int as "checksFailedCount",
       "day"                         as "day"
from "checks_daily"
group by "day"
order by "day" desc;
