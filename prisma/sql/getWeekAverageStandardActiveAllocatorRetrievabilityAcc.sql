-- @param {Boolean} $1:httpRetrievability
-- @param {Boolean} $2:urlFinderRetrievability
-- @param {DateTime} $3:week
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
                                 and ($5 = "data_type" or $5 is null))
--
select avg("avg_weighted_retrievability_success_rate_http") filter (where $1 = true or $1 is null)                    as "http",
       avg("avg_weighted_retrievability_success_rate_url_finder") filter (where $2 = true or $2 is null)              as "urlFinder"
from "allocators_weekly_acc"
         left join "allocator" on "allocators_weekly_acc"."allocator" = "allocator"."id"
         join "selected_allocators" on "selected_allocators"."allocator_id" = "allocator"."id"
where ("is_metaallocator" = false or "is_metaallocator" is null)
  and "week" = $3::timestamp;
