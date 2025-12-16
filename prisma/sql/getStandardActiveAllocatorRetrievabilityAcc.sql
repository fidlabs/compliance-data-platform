-- @param {String} $1:retrievabilityType
-- @param {DateTime} $2:startDate
-- @param {DateTime} $3:endDate
-- @param {Int} $4:editionId
-- @param {String} $5:allocatorDataType

with "active_allocators" as (select "allocator_id"            as "allocator_id",
                                    6                         as "edition_id",
                                    case
                                        when not (("registry_info"::jsonb -> 'application' -> 'audit') ?|
                                                    array ['Enterprise Data', 'Automated', 'Faucet', 'Market Based']) then 'openData'
                                        else 'enterprise' end as "data_type"
                             from "allocator_registry"
                             where "rejected" = false

                             union all

                             select "allocator_id" as "allocator_id",
                                    5              as "edition_id",
                                    null           as "data_type"
                             from "allocator_registry_archive"
                             where "rejected" = false),
--
     "selected_allocators" as (select distinct on ("allocator_id") "allocator_id" as "allocator_id",
                                                                   "edition_id"   as "edition_id",
                                                                   "data_type"    as "data_type"
                               from "active_allocators"
                               where ($4 = "edition_id" or $4 is null)
                                 and ($5 = "data_type" or $5 is null)),
--
     "allocator_weekly" as (select "week"                     as "week",
                                   "allocator"                as "allocator_id",
                                   "total_sum_of_allocations" as "total_sum_of_allocations",
                                   case
                                       when $1 = 'http' then "avg_weighted_retrievability_success_rate_http"
                                       when $1 = 'urlFinder' then "avg_weighted_retrievability_success_rate_url_finder"
                                       else "avg_weighted_retrievability_success_rate"
                                       end                    as "selected_retrievability"
                            from "allocators_weekly_acc"
                            where ($2::date is null or "week" >= $2)
                              and ($3::date is null or "week" <= $3))
--
select "week"                                       as "week",
       ceil("selected_retrievability" * 20) * 5 - 5 as "valueFromExclusive",
       ceil("selected_retrievability" * 20) * 5     as "valueToInclusive",
       count(*)::int                                as "count",
       sum("total_sum_of_allocations")::bigint      as "totalDatacap"
from "allocator_weekly"
         left join "allocator" on "allocator_weekly"."allocator_id" = "allocator"."id"
         join "selected_allocators" on "selected_allocators"."allocator_id" = "allocator"."id"
where "allocator"."is_metaallocator" = false or "allocator"."is_metaallocator" is null
group by "valueFromExclusive", "valueToInclusive", "week"
order by "week", "valueFromExclusive";
