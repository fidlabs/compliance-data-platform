-- @param {DateTime} $1:day

with "bounds" as (
         select date_trunc('day', $1::timestamp)                    as "todayStart",
                date_trunc('day', $1::timestamp) - interval '1 day' as "yesterdayStart",
                date_trunc('day', $1::timestamp) + interval '1 day' as "tomorrowStart"
     ),
     "today_results" as (
         select "report"."allocator"                  as "allocatorId",
                "report"."name"                       as "allocatorName",
                "report"."create_date"                as "reportCreateDate",
                "check_result"."allocator_report_id"  as "reportId",
                "check_result"."check"                as "check",
                "check_result"."result"               as "result",
                "check_result"."metadata"             as "metadata"
         from "allocator_report_check_result" "check_result"
                  join "allocator_report" "report"
                       on "check_result"."allocator_report_id" = "report"."id"
                  cross join "bounds"
         where "check_result"."create_date" >= "bounds"."todayStart"
           and "check_result"."create_date" < "bounds"."tomorrowStart"
     ),
     "requested_pairs" as (
         select distinct "allocatorId", "check"
         from "today_results"
     ),
     "requested_allocators" as (
         select distinct "allocatorId"
         from "today_results"
     ),
     "check_history" as (
         select "requested_pairs"."allocatorId" as "allocatorId",
                "requested_pairs"."check"       as "check",
                min("report_history"."create_date") filter (where "check_result_history"."result" = false) as "firstSeen",
                max("report_history"."create_date") filter (where "check_result_history"."result" = false) as "lastSeen",
                max("report_history"."create_date") filter (where "check_result_history"."result" = true)  as "lastPassed"
         from "requested_pairs"
                  join "allocator_report" "report_history"
                       on "report_history"."allocator" = "requested_pairs"."allocatorId"
                  join "allocator_report_check_result" "check_result_history"
                       on "check_result_history"."allocator_report_id" = "report_history"."id"
                      and "check_result_history"."check" = "requested_pairs"."check"
                  cross join "bounds"
         where "report_history"."create_date" < "bounds"."todayStart"
         group by "requested_pairs"."allocatorId", "requested_pairs"."check"
     ),
     "today" as (select "today_results"."allocatorId"                                                                    as "allocatorId",
                        "today_results"."allocatorName"                                                                  as "allocatorName",
                        (count(distinct "today_results"."check") filter (where "today_results"."result" = true))::int  as "checksPassedCount",
                        (count(distinct "today_results"."check") filter (where "today_results"."result" = false))::int as "checksFailedCount",
                        coalesce(
                                jsonb_agg(
                                        jsonb_build_object(
                                                'reportId', "today_results"."reportId",
                                                'reportCreateDate', to_char("today_results"."reportCreateDate" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                                                'check', "today_results"."check",
                                                'checkMsg', "today_results"."metadata"::jsonb -> 'msg',
                                                'firstSeen', to_char(coalesce("check_history"."firstSeen", "today_results"."reportCreateDate") at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                                                'lastSeen', to_char("check_history"."lastSeen" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                                                'lastPassed', to_char("check_history"."lastPassed" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                                                'isNewWeekly', coalesce("check_history"."lastSeen" < "today_results"."reportCreateDate" - interval '7 days', true),
                                                'isNewDaily', coalesce("check_history"."lastSeen" < "today_results"."reportCreateDate" - interval '36 hours', true)
                                        )
                                ) filter (where "today_results"."result" = false),
                                '[]'::jsonb
                        )                                                                                               as "failedChecks"
                 from "today_results"
                          left join "check_history"
                                    on "check_history"."check" = "today_results"."check"
                                   and "check_history"."allocatorId" = "today_results"."allocatorId"
                 group by "today_results"."allocatorId", "today_results"."allocatorName"),
--
     "yesterday" as (select "report"."allocator"                                                                          as "allocatorId",
                            (count(distinct "check_result"."check") filter ( where "check_result"."result" = true))::int  as "checksPassedCount",
                            (count(distinct "check_result"."check") filter ( where "check_result"."result" = false))::int as "checksFailedCount"
                     from "allocator_report_check_result" "check_result"
                              join "allocator_report" "report" on "check_result"."allocator_report_id" = "report"."id"
                              join "requested_allocators" on "requested_allocators"."allocatorId" = "report"."allocator"
                              cross join "bounds"
                     where "check_result"."create_date" >= "bounds"."yesterdayStart"
                       and "check_result"."create_date" < "bounds"."todayStart"
                     group by "report"."allocator")
--
select "today".*,
       case
           when "yesterday"."checksPassedCount" is not null then
               ("today"."checksPassedCount" - "yesterday"."checksPassedCount")
           end as "checksPassedChange",
       case
           when "yesterday"."checksFailedCount" is not null then
               ("today"."checksFailedCount" - "yesterday"."checksFailedCount")
           end as "checksFailedChange"
from "today"
         left join "yesterday" on "today"."allocatorId" = "yesterday"."allocatorId";
