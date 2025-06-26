-- @param {DateTime} $1:day

with "today" as (select (count(distinct "check") filter ( where "result" = true))::int  as "checksPassedCount",
                        (count(distinct "check") filter ( where "result" = false))::int as "checksFailedCount",
                        "allocator"                                                     as "allocatorId",
                        "name"                                                          as "allocatorName",
                        coalesce(
                                        jsonb_agg(
                                        distinct jsonb_build_object(
                                                'reportId', "allocator_report_id",
                                                'check', "check",
                                                'checkMsg', "metadata"::jsonb -> 'msg'
                                                 )
                                                 ) filter ( where "result" = false ), '[]'::jsonb
                        )                                                               as "failedChecks"
                 from "allocator_report_check_result"
                          join "allocator_report" on "allocator_report_check_result"."allocator_report_id" = "allocator_report"."id"
                 where date_trunc('day', "allocator_report_check_result"."create_date") = $1
                 group by "allocatorId", "allocatorName"),
     "yesterday" as (select (count(distinct "check") filter ( where "result" = true))::int  as "checksPassedCount",
                            (count(distinct "check") filter ( where "result" = false))::int as "checksFailedCount",
                            "allocator"                                                     as "allocatorId"
                     from "allocator_report_check_result"
                              join "allocator_report" on "allocator_report_check_result"."allocator_report_id" = "allocator_report"."id"
                     where date_trunc('day', "allocator_report_check_result"."create_date") = date_trunc('day', $1::timestamp) - interval '1 day'
                     group by "allocatorId")
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
