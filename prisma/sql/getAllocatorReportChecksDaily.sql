-- @param {DateTime} $1:week

with "checks_daily_per_allocator" as (select count(distinct "check") filter (where "result" = true)  as "checksPassedCount",
                                             count(distinct "check") filter (where "result" = false) as "checksFailedCount",
                                             date_trunc('day', "allocator_report"."create_date")     as "day"
                                      from "allocator_report_check_result"
                                               join "allocator_report" on "allocator_report_check_result"."allocator_report_id" = "allocator_report"."id"
                                      where date_trunc('week', "allocator_report"."create_date") = $1
                                      group by "allocator", "day"),
--
     "checks_daily" as (select sum("checksPassedCount")::int as "checksPassedCount",
                               sum("checksFailedCount")::int as "checksFailedCount",
                               "day"
                        from "checks_daily_per_allocator"
                        group by "day"),
--
     "checks_daily_with_lag" as (select *,
                                        lag("checksPassedCount") over (order by "day") as "checksPassedCountLag",
                                        lag("checksFailedCount") over (order by "day") as "checksFailedCountLag",
                                        lag("day") over (order by "day")               as "dayLag"
                                 from "checks_daily")
--
select "day"               as "day",
       "checksPassedCount" as "checksPassedCount",
       case
           when "dayLag" is not null and "day" - "dayLag" = interval '1 day'
               then "checksPassedCount" - "checksPassedCountLag"
           end             as "checksPassedChange",
       "checksFailedCount" as "checksFailedCount",
       case
           when "dayLag" is not null and "day" - "dayLag" = interval '1 day'
               then "checksFailedCount" - "checksFailedCountLag"
           end             as "checksFailedChange"
from "checks_daily_with_lag"
order by "day" desc;
