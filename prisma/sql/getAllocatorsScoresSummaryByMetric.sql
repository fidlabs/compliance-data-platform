-- @param {String} $1:groupBy
-- @param {String} $2:dataType?
-- @param {Decimal} $3:mediumScoreThreshold?
-- @param {Decimal} $4:highScoreThreshold?
-- @param {Boolean} $5:includeDetails?

with "max_ranges" as (select "scoring_result_id" as "scoring_result_id",
                             max("score")        as "max_score"
                      from "allocator_report_scoring_result_range"
                      group by "scoring_result_id"),
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
     "latest_reports_by_date" as (select distinct on ("allocator_id", "date") "allocator_report"."id"                              as "report_id",
                                                                              "allocator_report"."allocator"                       as "allocator_id",
                                                                              date_trunc($1, "allocator_report"."create_date")     as "date",
                                                                              "allocator_report"."create_date"                     as "create_date",

                                                                              (select "total_sum_of_allocations"
                                                                               from "allocators_weekly_acc"
                                                                               where date_trunc($1, "allocators_weekly_acc"."week") <= date_trunc($1, "allocator_report"."create_date")
                                                                                 and "allocators_weekly_acc"."allocator" = "allocator_report"."allocator"
                                                                               order by "week" desc
                                                                               limit 1)                                            as "total_datacap",

                                                                              case
                                                                                  when "allocator_report"."allocator" in (select "allocator_id" from "open_data_pathway_allocators")
                                                                                      then 'openData'
                                                                                  else 'enterprise' end                            as "data_type"
                                  from "allocator_report"
                                  order by "allocator_id", "date", "allocator_report"."create_date" desc),
--
     "report_scores" as (select "latest_reports_by_date"."allocator_id"                as "allocator_id",
                                "latest_reports_by_date"."data_type"                   as "data_type",
                                "latest_reports_by_date"."report_id"                   as "report_id",
                                "latest_reports_by_date"."date"                        as "date",
                                "latest_reports_by_date"."create_date"                 as "create_date",
                                "allocator_report_scoring_result"."metric"             as "metric",
                                "allocator_report_scoring_result"."metric_name"        as "metric_name",
                                "allocator_report_scoring_result"."metric_description" as "metric_description",
                                "allocator_report_scoring_result"."metric_unit"        as "metric_unit",
                                "latest_reports_by_date"."total_datacap"               as "total_datacap",
                                sum("allocator_report_scoring_result"."score")::int    as "total_score",
                                sum(coalesce("max_ranges"."max_score", 0))::int        as "max_possible_score"
                         from "latest_reports_by_date"
                                  join "allocator_report_scoring_result"
                                       on "allocator_report_scoring_result"."allocator_report_id" = "latest_reports_by_date"."report_id"
                                  left join "max_ranges"
                                            on "allocator_report_scoring_result"."id" = "max_ranges"."scoring_result_id"
                         where ($2::text is null or "latest_reports_by_date"."data_type" = $2::text)
                         group by "latest_reports_by_date"."allocator_id",
                                  "latest_reports_by_date"."date",
                                  "latest_reports_by_date"."create_date",
                                  "allocator_report_scoring_result"."metric",
                                  "allocator_report_scoring_result"."metric_name",
                                  "allocator_report_scoring_result"."metric_description",
                                  "allocator_report_scoring_result"."metric_unit",
                                  "latest_reports_by_date"."report_id",
                                  "latest_reports_by_date"."data_type",
                                  "latest_reports_by_date"."total_datacap"),
--
     "report_score_groups" as (select *,
                                      case
                                          when "max_possible_score" = 0 then 'high'
                                          when 100.0 * "total_score" / "max_possible_score" >= coalesce($4, 75) then 'high'
                                          when 100.0 * "total_score" / "max_possible_score" >= coalesce($3, 30) then 'medium'
                                          else 'low'
                                          end as "score_group"
                               from "report_scores"),
--
     "grouped_metrics" as (select "metric"                                                                           as "metric",
                                  "date"                                                                             as "date",
                                  "metric_name"                                                                      as "metricName",
                                  "metric_description"                                                               as "metricDescription",
                                  "metric_unit"                                                                      as "metricUnit",

                                  jsonb_agg(
                                  jsonb_build_object(
                                          'allocatorId', "allocator_id",
                                          'dataType', "data_type",
                                          'reportId', "report_id",
                                          'createDate', to_char("create_date" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                                          'totalScore', "total_score",
                                          'maxPossibleScore', "max_possible_score",
                                          'scorePercentage', case
                                                                 when "max_possible_score" = 0 then '100'
                                                                 else round(100.0 * "total_score" / "max_possible_score", 2)::text end,
                                          'totalDatacap', "total_datacap"::text
                                  ) order by "allocator_id"
                                           ) filter ( where "score_group" = 'high' )                                 as "scoreHighAllocators",
                                  count(*) filter (where "score_group" = 'high')                                     as "scoreHighAllocatorsCount",
                                  sum("total_datacap") filter (where "score_group" = 'high')                         as "scoreHighAllocatorsDatacap",

                                  jsonb_agg(
                                  jsonb_build_object(
                                          'allocatorId', "allocator_id",
                                          'dataType', "data_type",
                                          'reportId', "report_id",
                                          'createDate', to_char("create_date" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                                          'totalScore', "total_score",
                                          'maxPossibleScore', "max_possible_score",
                                          'scorePercentage', case
                                                                 when "max_possible_score" = 0 then '100'
                                                                 else round(100.0 * "total_score" / "max_possible_score", 2)::text end,
                                          'totalDatacap', "total_datacap"::text
                                  ) order by "allocator_id"
                                           ) filter ( where "score_group" = 'medium' )                               as "scoreMediumAllocators",
                                  count(*) filter (where "score_group" = 'medium')                                   as "scoreMediumAllocatorsCount",
                                  sum("total_datacap") filter (where "score_group" = 'medium')                       as "scoreMediumAllocatorsDatacap",

                                  jsonb_agg(
                                  jsonb_build_object(
                                          'allocatorId', "allocator_id",
                                          'dataType', "data_type",
                                          'reportId', "report_id",
                                          'createDate', to_char("create_date" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                                          'totalScore', "total_score",
                                          'maxPossibleScore', "max_possible_score",
                                          'scorePercentage', case
                                                                 when "max_possible_score" = 0 then '100'
                                                                 else round(100.0 * "total_score" / "max_possible_score", 2)::text end,
                                          'totalDatacap', "total_datacap"::text
                                  ) order by "allocator_id"
                                           ) filter ( where "score_group" = 'low' )                                  as "scoreLowAllocators",
                                  count(*) filter (where "score_group" = 'low')                                      as "scoreLowAllocatorsCount",
                                  sum("total_datacap") filter (where "score_group" = 'low')                          as "scoreLowAllocatorsDatacap"
                           from "report_score_groups"
                           group by "metric", "date", "metricName", "metricDescription", "metricUnit")
--
select "metric"            as "metric",
       "metricName"        as "metricName",
       "metricDescription" as "metricDescription",
       "metricUnit"        as "metricUnit",
       jsonb_agg(
               jsonb_build_object(
                       'date', to_char("date" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                       'scoreHighAllocatorsCount', "scoreHighAllocatorsCount",
                       'scoreHighAllocators', case when $5 then coalesce("scoreHighAllocators", '[]'::jsonb) end,
                       'scoreHighAllocatorsDatacap', coalesce("scoreHighAllocatorsDatacap"::text, '0'),
                       'scoreMediumAllocatorsCount', "scoreMediumAllocatorsCount",
                       'scoreMediumAllocators', case when $5 then coalesce("scoreMediumAllocators", '[]'::jsonb) end,
                       'scoreMediumAllocatorsDatacap', coalesce("scoreMediumAllocatorsDatacap"::text, '0'),
                       'scoreLowAllocatorsCount', "scoreLowAllocatorsCount",
                       'scoreLowAllocators', case when $5 then coalesce("scoreLowAllocators", '[]'::jsonb) end,
                       'scoreLowAllocatorsDatacap', coalesce("scoreLowAllocatorsDatacap"::text, '0')
               ) order by "date"
       )                   as "data"
from "grouped_metrics"
group by "metric", "metricName", "metricDescription", "metricUnit"
order by "metric";
