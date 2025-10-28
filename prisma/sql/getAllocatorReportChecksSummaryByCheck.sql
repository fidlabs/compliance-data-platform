-- @param {String} $1:groupBy

with "check_name_description" as (select "check"             as "check",
                                         "check_name"        as "check_name",
                                         "check_description" as "check_description"
                                  from "allocator_report_check_result"
                                  where "check_name" is not null
                                    and "check_description" is not null
                                  group by "check", "check_name", "check_description"),
--
     "checks_by_date" as (select "allocator_report_check_result"."check"               as "check",
                                 date_trunc($1, "allocator_report"."create_date")      as "date",
                                 "allocator_report"."allocator"                        as "allocatorId",
                                 bool_and("allocator_report_check_result"."result")    as "all_passed",
                                 bool_or(not "allocator_report_check_result"."result") as "any_failed",
                                 "check_name_description"."check_name"                 as "check_name",
                                 "check_name_description"."check_description"          as "check_description",

                                 (select "total_sum_of_allocations"
                                  from "allocators_weekly_acc"
                                  where date_trunc($1, "allocators_weekly_acc"."week") <= date_trunc($1, "allocator_report"."create_date")
                                    and "allocators_weekly_acc"."allocator" = "allocator_report"."allocator"
                                  order by "week" desc
                                  limit 1)                                             as "totalDatacap"
                          from "allocator_report_check_result"
                                   join "allocator_report"
                                        on "allocator_report_check_result"."allocator_report_id" = "allocator_report"."id"
                                   left join "check_name_description"
                                             on "check_name_description"."check" = "allocator_report_check_result"."check"
                          group by "allocator_report_check_result"."check",
                                   "allocator_report"."create_date",
                                   "allocator_report"."allocator",
                                   "check_name_description"."check_name",
                                   "check_name_description"."check_description"),
--
     "checks_by_date_and_check" as (select "check"                                                   as "check",
                                           "date"                                                    as "date",
                                           "check_name"                                              as "checkName",
                                           "check_description"                                       as "checkDescription",
                                           count(distinct "allocatorId") filter (where "all_passed") as "checkPassedAllocatorsCount",
                                           count(distinct "allocatorId") filter (where "any_failed") as "checkFailedAllocatorsCount",

                                           (select sum("totalDatacap")::text
                                            from (select distinct "allocatorId", "totalDatacap"
                                                  from "checks_by_date" "sub"
                                                  where "sub"."check" = "outer_sub"."check"
                                                    and "sub"."date" = "outer_sub"."date"
                                                    and "sub"."all_passed") "s")                     as "checkPassedAllocatorsDatacap",

                                           (select sum("totalDatacap")::text
                                            from (select distinct "allocatorId", "totalDatacap"
                                                  from "checks_by_date" "sub"
                                                  where "sub"."check" = "outer_sub"."check"
                                                    and "sub"."date" = "outer_sub"."date"
                                                    and "sub"."any_failed") "s")                     as "checkFailedAllocatorsDatacap",

                                           jsonb_agg(
                                           distinct jsonb_build_object(
                                                   'allocatorId', "allocatorId",
                                                   'totalDatacap', "totalDatacap"::text
                                                    )) filter ( where "all_passed" )                 as "checkPassedAllocators",

                                           jsonb_agg(
                                           distinct jsonb_build_object(
                                                   'allocatorId', "allocatorId",
                                                   'totalDatacap', "totalDatacap"::text
                                                    )) filter ( where "any_failed" )                 as "checkFailedAllocators"
                                    from "checks_by_date" as "outer_sub"
                                    group by "check", "date", "check_name", "check_description")
--
select "check"            as "check",
       "checkName"        as "checkName",
       "checkDescription" as "checkDescription",
       jsonb_agg(
               jsonb_build_object(
                       'date', to_char("date" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                       'checkPassedAllocatorsCount', "checkPassedAllocatorsCount",
                       'checkFailedAllocatorsCount', "checkFailedAllocatorsCount",
                       'checkPassedAllocatorsDatacap', coalesce("checkPassedAllocatorsDatacap", '0'),
                       'checkFailedAllocatorsDatacap', coalesce("checkFailedAllocatorsDatacap", '0'),
                       'passedAllocators', coalesce("checkPassedAllocators", '[]'::jsonb),
                       'failedAllocators', coalesce("checkFailedAllocators", '[]'::jsonb)
               )
               order by "date" desc
       )                  as "data"
from "checks_by_date_and_check"
group by "check", "checkName", "checkDescription"
order by "check";
