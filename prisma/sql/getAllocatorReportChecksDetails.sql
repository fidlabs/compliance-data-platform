-- @param {DateTime} $1:day

with "today" as (select "allocator"                                                     as "allocatorId",
                        "name"                                                          as "allocatorName",
                        (count(distinct "check") filter ( where "result" = true))::int  as "checksPassedCount",
                        (count(distinct "check") filter ( where "result" = false))::int as "checksFailedCount",
                        coalesce(
                                        jsonb_agg(
                                        distinct jsonb_build_object(
                                                'reportId', "allocator_report_id",
                                                'check', "check",
                                                'checkMsg', "metadata"::jsonb -> 'msg',
                                                'firstSeen', "check_history"."firstSeen",
                                                'lastSeen', "check_history"."lastSeen",
                                                'isNewWeekly', "check_history"."isNewWeekly",
                                                'isNewDaily', "check_history"."isNewDaily"
                                                 )
                                                 ) filter (where "result" = false),
                                        '[]'::jsonb
                        )                                                               as "failedChecks"
--
                 from "allocator_report_check_result"
                          join "allocator_report" "ar_main" on "allocator_report_check_result"."allocator_report_id" = "ar_main"."id"
--
                          left join lateral ( select min("ar"."create_date")                                                     as "firstSeen",
                                                     max("ar"."create_date")                                                     as "lastSeen",
                                                     coalesce(max("ar"."create_date") < $1::timestamp - interval '7 days', true) as "isNewWeekly",
                                                     coalesce(max("ar"."create_date") < $1::timestamp - interval '1 day', true)  as "isNewDaily"
                                              from "allocator_report_check_result" "arc"
                                                       join "allocator_report" "ar" on "arc"."allocator_report_id" = "ar"."id"
                                              where "arc"."check" = "allocator_report_check_result"."check"
                                                and "ar"."allocator" = "ar_main"."allocator"
                                                and date_trunc('day', "ar"."create_date") <= date_trunc('day', $1::timestamp)
                     ) as "check_history" on true
--
                 where date_trunc('day', "allocator_report_check_result"."create_date") = date_trunc('day', $1::timestamp)
                 group by "ar_main"."allocator", "ar_main"."name"),
--
     "yesterday" as (select "allocator"                                                     as "allocatorId",
                            (count(distinct "check") filter ( where "result" = true))::int  as "checksPassedCount",
                            (count(distinct "check") filter ( where "result" = false))::int as "checksFailedCount"
                     from "allocator_report_check_result"
                              join "allocator_report" on "allocator_report_check_result"."allocator_report_id" = "allocator_report"."id"
                     where date_trunc('day', "allocator_report_check_result"."create_date") = date_trunc('day', $1::timestamp) - interval '1 day'
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
