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
                                 "allocators_datacap"."totalDatacap"                   as "totalDatacap"
                          from "allocator_report_check_result"
                                   join "allocator_report"
                                        on "allocator_report_check_result"."allocator_report_id" = "allocator_report"."id"
                                   left join "check_name_description"
                                             on "check_name_description"."check" = "allocator_report_check_result"."check"
                                   left join lateral (
                                             select "allocators_weekly_acc"."total_sum_of_allocations" as "totalDatacap"
                                             from "allocators_weekly_acc"
                                             where "allocators_weekly_acc"."allocator" = "allocator_report"."allocator"
                                               and date_trunc($1, "allocators_weekly_acc"."week") <= date_trunc($1, "allocator_report"."create_date")
                                             order by "allocators_weekly_acc"."week" desc
                                             limit 1
                                             ) "allocators_datacap" on true
                          group by "allocator_report_check_result"."check",
                                   "allocator_report"."create_date",
                                   "allocator_report"."allocator",
                                   "check_name_description"."check_name",
                                   "check_name_description"."check_description",
                                   "allocators_datacap"."totalDatacap"),
--
     "checks_by_date_allocator" as (select distinct *
                                    from "checks_by_date"),
--
     "checks_by_date_and_check" as (select "check"                                          as "check",
                                           "date"                                           as "date",
                                           "check_name"                                     as "checkName",
                                           "check_description"                              as "checkDescription",
                                           count("allocatorId") filter (where "all_passed") as "checkPassedAllocatorsCount",
                                           count("allocatorId") filter (where "any_failed") as "checkFailedAllocatorsCount",
                                           sum("totalDatacap") filter (where "all_passed")
                                               ::text                                       as "checkPassedAllocatorsDatacap",
                                           sum("totalDatacap") filter (where "any_failed")
                                               ::text                                       as "checkFailedAllocatorsDatacap"
                                    from "checks_by_date_allocator"
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
                       'checkFailedAllocatorsDatacap', coalesce("checkFailedAllocatorsDatacap", '0')
               )
               order by "date" desc
       )                  as "data"
from "checks_by_date_and_check"
group by "check", "checkName", "checkDescription"
order by "check";
