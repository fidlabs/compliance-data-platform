-- @param {DateTime} $1:day Date for which report checks will be counted
-- @param {Boolean} $2:check_result? Check result, optional, leave empty to count both failed and passed checks

with "check_per_allocator" as
         (select distinct on ("report"."allocator") count("check"."id") as "checks_count"
          from "allocator_report" as "report"
                   join "allocator_report_check_result" as "check"
                        on "check"."allocator_report_id" = "report"."id"
          where "check"."create_date" between symmetric date_trunc('day', $1::date) and date_trunc('day', $1::date) + '1 day'::interval
            and ($2::boolean is null or "check"."result" = $2::boolean)
          group by "report"."allocator", "report"."create_date"
          order by "report"."allocator", "report"."create_date" desc)
--
select sum("checks_count")::int as "total_checks_count"
from "check_per_allocator";
