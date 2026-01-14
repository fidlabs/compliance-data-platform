-- @param {Boolean} $1:urlFinderRetrievability
-- @param {DateTime} $2:week
-- @param {Int} $3:editionId
-- @param {String} $4:allocatorDataType

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
                               where ($3 = "edition_id" or $3 is null)
                                 and ($4 = "data_type" or $4 is null))
--
select avg("avg_weighted_retrievability_success_rate_url_finder") filter (where $1 = true or $1 is null)              as "urlFinder"
from "allocators_weekly_acc"
         left join "allocator" on "allocators_weekly_acc"."allocator" = "allocator"."id"
         join "selected_allocators" on "selected_allocators"."allocator_id" = "allocator"."id"
where ("is_metaallocator" = false or "is_metaallocator" is null)
  and "week" = $2::timestamp;
