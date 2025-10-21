-- @param {String} $1:dataType?

with "max_ranges" as (select "scoring_result_id" as "scoring_result_id",
                             max("score")        as "max_score"
                      from "allocator_report_scoring_result_range"
                      group by "scoring_result_id"),
--
     "latest_reports" as (select distinct on ("allocator") "id"        as "report_id",
                                                           "allocator" as "allocator",
                                                           "name"      as "name"
                          from "allocator_report"
                          order by "allocator", "create_date" desc),
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
     "_result" as (select "latest_reports"."allocator"                        as "allocatorId",
                          "latest_reports"."name"                             as "allocatorName",
                          sum("allocator_report_scoring_result"."score")::int as "totalScore",
                          sum(coalesce("max_ranges"."max_score", 0))::int     as "maxPossibleScore",
                          case
                              when "allocator" in (select "allocator_id" from "open_data_pathway_allocators") then 'openData'
                              else 'enterprise' end                           as "dataType"
                   from "latest_reports"
                            join "allocator_report_scoring_result"
                                 on "latest_reports"."report_id" = "allocator_report_scoring_result"."allocator_report_id"
                            left join "max_ranges"
                                      on "allocator_report_scoring_result"."id" = "max_ranges"."scoring_result_id"
                   group by "latest_reports"."allocator", "latest_reports"."name"),
--
     "result" as (select *,
                         case
                             when "_result"."maxPossibleScore" = 0 then 100
                             else 100 * "_result"."totalScore"::float / "_result"."maxPossibleScore"::float end as "_scorePercentage"
                  from "_result"
                  where ($1::text is null or "_result"."dataType" = $1::text))
--
select "result"."allocatorId"                           as "allocatorId",
       "result"."allocatorName"                         as "allocatorName",
       "result"."totalScore"                            as "totalScore",
       "result"."maxPossibleScore"                      as "maxPossibleScore",
       "result"."dataType"                              as "dataType",
       to_char("result"."_scorePercentage", 'FM999.00') as "scorePercentage"
from "result"
order by "result"."_scorePercentage" desc;
