with "checks_weekly" as (select count(distinct "check") filter ( where "result" = true)  as "checksPassedCount",
                                count(distinct "check") filter ( where "result" = false) as "checksFailedCount",
                                date_trunc('week', "allocator_report"."create_date")     as "week"
                         from "allocator_report_check_result"
                                  join "allocator_report" on "allocator_report_check_result"."allocator_report_id" = "allocator_report"."id"
                         group by "allocator", "week")
select sum("checksPassedCount")::int as "checksPassedCount",
       sum("checksFailedCount")::int as "checksFailedCount",
       "week"                        as "week"
from "checks_weekly"
group by "week"
order by "week" desc;
