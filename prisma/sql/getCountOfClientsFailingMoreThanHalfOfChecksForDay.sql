-- @param {DateTime} $1:day Date for which report checks will be counted

with "summary_for_client" as
         (select distinct on ("report"."client") "report"."client"                       as "client",
                                                 count("check"."id")                     as "checks_count",
                                                 count("check"."id")
                                                 filter (where "check"."result" = false) as "failed_checks"
          from "client_report" as "report"
                   join "client_report_check_result" as "check"
                        on "check"."client_report_id" = "report"."id"
          where "check"."create_date" between date_trunc('day', $1::date)
                    and date_trunc('day', $1::date) + '1 day'::interval
          group by "report"."client", "report"."create_date"
          order by "report"."client", "report"."create_date" desc)
--
select count("entry"."client")                                             as "total_clients_count",
       count("entry"."client")
       filter (where "entry"."failed_checks" * 2 > "entry"."checks_count") as "failing_clients_count"
from "summary_for_client" as "entry"
limit 1;
