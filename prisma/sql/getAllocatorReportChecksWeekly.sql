with "checks_weekly_per_allocator" as (select count(distinct "check") filter ( where "result" = true)  as "checksPassedCount",
                                              count(distinct "check") filter ( where "result" = false) as "checksFailedCount",
                                              date_trunc('week', "allocator_report"."create_date")     as "week"
                                       from "allocator_report_check_result"
                                                join "allocator_report" on "allocator_report_check_result"."allocator_report_id" = "allocator_report"."id"
                                       group by "allocator", "week"),
     "checks_weekly" as (select sum("checksPassedCount")::int as "checksPassedCount",
                                sum("checksFailedCount")::int as "checksFailedCount",
                                "week"                        as "week"
                         from "checks_weekly_per_allocator"
                         group by "week"),
     "checks_weekly_with_lag" as (select *,
                                         lag("checksPassedCount") over (order by "week") as "checksPassedCountLag",
                                         lag("checksFailedCount") over (order by "week") as "checksFailedCountLag",
                                         lag("week") over (order by "week")              as "weekLag"
                                  from "checks_weekly")
select "week"                 as "week",
       "checksPassedCount"    as "checksPassedCount",
       case
           when "weekLag" is not null and "week" - "weekLag" = interval '7 days'
               then "checksPassedCount" - "checksPassedCountLag"
           end                as "checksPassedChange",
       "checksFailedCount"    as "checksFailedCount",
       case
           when "weekLag" is not null and "week" - "weekLag" = interval '7 days'
               then "checksFailedCount" - "checksFailedCountLag"
           end                as "checksFailedChange"
from "checks_weekly_with_lag"
order by "week" desc;
