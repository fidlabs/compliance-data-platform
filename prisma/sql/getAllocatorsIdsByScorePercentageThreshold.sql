-- @param {Decimal} $1:minScorePercentage
-- @param {Decimal} $2:maxScorePercentage
-- @param {DateTime} $3:thresholdDate

with "max_range" as (select "scoring_result_id" as "scoring_result_id",
                            max("score")        as "max_score"
                     from "allocator_report_scoring_result_range"
                     group by "scoring_result_id"),
--
     "allocator_score" as (select "report"."allocator"                                                                       as "allocator",
                                  sum("scoring_result"."score")::decimal / nullif(sum("range"."max_score"), 0)::decimal      as "score_percentage",
                                  row_number() over (partition by "report"."allocator" order by "report"."create_date" desc) as "row_index"
                           from "allocator_report" as "report"
                                    left join "allocator_report_scoring_result" as "scoring_result"
                                              on "report"."id" = "scoring_result"."allocator_report_id"
                                    left join "max_range" as "range"
                                              on "range"."scoring_result_id" = "scoring_result"."id"
                           where "report"."create_date" <= $3::date
                           group by "report"."allocator", "report"."create_date"
                           order by "report"."allocator", "report"."create_date" desc)
--
select "allocator"
from "allocator_score"
where "row_index" = 1
  and "score_percentage" between $1::decimal and $2::decimal;
