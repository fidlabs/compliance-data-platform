-- @param {String} $1:dataType?

with "max_ranges" as (select "scoring_result_id" as "scoring_result_id",
                             max("score")        as "max_score"
                      from "allocator_report_scoring_result_range"
                      group by "scoring_result_id"),
--
     "reports_with_offset" as (select "allocator_report"."id"                             as "report_id",
                                      "allocator_report"."allocator"                      as "allocatorId",
                                      sum("allocator_report_scoring_result"."score")::int as "totalScore",
                                      sum(coalesce("max_ranges"."max_score", 0))::int     as "maxPossibleScore",
                                      "allocator_report"."name"                           as "allocatorName",
                                      "allocator_report"."create_date"                    as "create_date"
                               from "allocator_report"
                                        join "allocator_report_scoring_result"
                                             on "allocator_report"."id" = "allocator_report_scoring_result"."allocator_report_id"
                                        left join "max_ranges"
                                                  on "allocator_report_scoring_result"."id" = "max_ranges"."scoring_result_id"
                               group by "allocator_report"."id", "allocator_report"."allocator", "allocator_report"."create_date"),
--
     "_latest_reports" as (select distinct on ("allocatorId") *
                           from "reports_with_offset"
                           where "reports_with_offset"."create_date" <= now()
                           order by "reports_with_offset"."allocatorId", "reports_with_offset"."create_date" desc),
--
     "latest_reports" as (select *,
                                 case
                                     when "_latest_reports"."maxPossibleScore" = 0 then 100
                                     else 100 * "_latest_reports"."totalScore"::float / "_latest_reports"."maxPossibleScore"::float end as "_scorePercentage"
                          from "_latest_reports"),
--
     "_week_ago_reports" as (select distinct on ("allocatorId") *
                             from "reports_with_offset"
                             where "reports_with_offset"."create_date" <= now() - interval '7 days'
                             order by "reports_with_offset"."allocatorId", "reports_with_offset"."create_date" desc),
--
     "week_ago_reports" as (select *,
                                   case
                                       when "_week_ago_reports"."maxPossibleScore" = 0 then 100
                                       else 100 * "_week_ago_reports"."totalScore"::float / "_week_ago_reports"."maxPossibleScore"::float end as "_scorePercentage"
                            from "_week_ago_reports"),
--
     "_month_ago_reports" as (select distinct on ("allocatorId") *
                             from "reports_with_offset"
                             where "reports_with_offset"."create_date" <= now() - interval '30 days'
                             order by "reports_with_offset"."allocatorId", "reports_with_offset"."create_date" desc),
--
     "month_ago_reports" as (select *,
                                   case
                                       when "_month_ago_reports"."maxPossibleScore" = 0 then 100
                                       else 100 * "_month_ago_reports"."totalScore"::float / "_month_ago_reports"."maxPossibleScore"::float end as "_scorePercentage"
                            from "_month_ago_reports"),
--
     "active_allocators" as (select "allocator_id"  as "allocator_id",
                                    "registry_info" as "registry_info",
                                    6               as "editionId"
                             from "allocator_registry"
                             where "rejected" = false

                             union all

                             select "allocator_id"  as "allocator_id",
                                    "registry_info" as "registry_info",
                                    5               as "editionId"
                             from "allocator_registry_archive"
                             where "rejected" = false),
--
     "active_in_edition" as (select *
                             from "active_allocators"),
--
     "open_data_pathway_allocators" as (
         -- edition 6: open = not enterprise, automated, faucet, market based
         select distinct "active_in_edition"."allocator_id"
         from "active_in_edition"
         where "active_in_edition"."editionId" = 6
           and not (("active_in_edition"."registry_info"::jsonb->'application'->'audit') ?|
               array['Enterprise Data', 'Automated', 'Faucet', 'Market Based'])

         union

         -- edition 5: open by bookkeeping
         select distinct "allocator_client_bookkeeping"."allocator_id"
         from "allocator_client_bookkeeping"
                  join "active_in_edition" on "allocator_client_bookkeeping"."allocator_id" = "active_in_edition"."allocator_id"
         where "active_in_edition"."editionId" = 5
           and lower(
                       "allocator_client_bookkeeping"."bookkeeping_info"::jsonb->'Project'->>'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)'
               ) in ('[x] i confirm', 'yes')),
--
     "result" as (select "latest_reports"."allocatorId"                                           as "allocatorId",
                         "latest_reports"."allocatorName"                                         as "allocatorName",
                         "latest_reports"."totalScore"                                            as "totalScore",
                         "latest_reports"."maxPossibleScore"                                      as "maxPossibleScore",
                         to_char("latest_reports"."_scorePercentage", 'FM999.00')                 as "scorePercentage",
                         (select "total_sum_of_allocations"
                                  from "allocators_weekly_acc"
                                    where "allocators_weekly_acc"."allocator" = "latest_reports"."allocatorId"
                                  order by "week" desc
                                  limit 1)                                                        as "totalDatacap",
                         case
                             when "week_ago_reports"."_scorePercentage" is null then null
                             else to_char("week_ago_reports"."_scorePercentage", 'FM999.00') end  as "weekAgoScorePercentage",
                         case
                             when "month_ago_reports"."_scorePercentage" is null then null
                             else to_char("month_ago_reports"."_scorePercentage", 'FM999.00') end as "monthAgoScorePercentage",
                         case
                             when "latest_reports"."allocatorId" in (select "allocator_id" from "open_data_pathway_allocators") then 'openData'
                             else 'enterprise' end                                                as "dataType"
                  from "latest_reports"
                           left join "week_ago_reports" on "latest_reports"."allocatorId" = "week_ago_reports"."allocatorId"
                           left join "month_ago_reports" on "latest_reports"."allocatorId" = "month_ago_reports"."allocatorId")
--
select *
from "result"
where ($1::text is null or "result"."dataType" = $1::text)
order by "result"."scorePercentage" desc, "result"."allocatorId";
