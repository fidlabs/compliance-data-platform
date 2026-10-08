-- @param {DateTime} $1:day

with "today" as (select "report"."allocator"                                                                          as "allocatorId",
                        "report"."name"                                                                               as "allocatorName",
                        (count(distinct "check_result"."check") filter ( where "check_result"."result" = true))::int  as "checksPassedCount",
                        (count(distinct "check_result"."check") filter ( where "check_result"."result" = false))::int as "checksFailedCount",
                        coalesce(
                                        jsonb_agg(
                                        distinct jsonb_build_object(
                                                'reportId', "check_result"."allocator_report_id",
                                                'reportCreateDate', to_char("report"."create_date" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                                                'check', "check_result"."check",
                                                'checkMsg', "check_result"."metadata"::jsonb -> 'msg',
                                                'firstSeen', to_char(coalesce("check_history"."firstSeen", "report"."create_date") at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                                                'lastSeen', to_char("check_history"."lastSeen" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                                                'lastPassed', to_char("check_history"."lastPassed" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                                                'isNewWeekly', coalesce("check_history"."lastSeen" < "report"."create_date" - interval '7 days', true),
                                                'isNewDaily', coalesce("check_history"."lastSeen" < "report"."create_date" - interval '36 hours', true)
                                                 )
                                                 ) filter (where "check_result"."result" = false),
                                        '[]'::jsonb
                        )                                                                                             as "failedChecks"
--
                 from "allocator_report_check_result" "check_result"
                          join "allocator_report" "report" on "check_result"."allocator_report_id" = "report"."id"
--
                          left join lateral ( select min("report_history"."create_date") filter ( where "check_result_history"."result" = false ) as "firstSeen",
                                                     max("report_history"."create_date") filter ( where "check_result_history"."result" = false ) as "lastSeen",
                                                     max("report_history"."create_date") filter ( where "check_result_history"."result" = true )  as "lastPassed"
                                              from "allocator_report_check_result" "check_result_history"
                                                       join "allocator_report" "report_history" on "check_result_history"."allocator_report_id" = "report_history"."id"
                                              where "check_result_history"."check" = "check_result"."check"
                                                and "report_history"."allocator" = "report"."allocator"
                                                and date_trunc('day', "report_history"."create_date") < date_trunc('day', $1::timestamp)
                     ) as "check_history" on true
--
                 where date_trunc('day', "check_result"."create_date") = date_trunc('day', $1::timestamp)
                 group by "report"."allocator", "report"."name"),
--
     "yesterday" as (select "report"."allocator"                                                                          as "allocatorId",
                            (count(distinct "check_result"."check") filter ( where "check_result"."result" = true))::int  as "checksPassedCount",
                            (count(distinct "check_result"."check") filter ( where "check_result"."result" = false))::int as "checksFailedCount"
                     from "allocator_report_check_result" "check_result"
                              join "allocator_report" "report" on "check_result"."allocator_report_id" = "report"."id"
                     where date_trunc('day', "check_result"."create_date") = date_trunc('day', $1::timestamp) - interval '1 day'
                     group by "allocatorId")
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
