-- @param {DateTime} $1:day

select (count(distinct "check") filter ( where "result" = true))::int  as "checksPassedCount",
       (count(distinct "check") filter ( where "result" = false))::int as "checksFailedCount",
       "allocator"                                                     as "allocatorId",
       "name"                                                          as "allocatorName",
       coalesce(
                       jsonb_agg(
                       distinct jsonb_build_object(
                               'reportId', "allocator_report_id",
                               'check', "check",
                               'checkMsg', "metadata"::jsonb->'msg'
                                )
                                ) filter ( where "result" = false ), '[]'::jsonb
       )                                                        as "failedChecks"
from "allocator_report_check_result"
         join "allocator_report" on "allocator_report_check_result"."allocator_report_id" = "allocator_report"."id"
where date_trunc('day', "allocator_report_check_result"."create_date") = $1
group by "allocatorId", "allocatorName";
