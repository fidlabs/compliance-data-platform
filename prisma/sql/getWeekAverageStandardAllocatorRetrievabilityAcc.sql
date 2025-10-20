-- @param {Boolean} $1:openDataOnly
-- @param {String} $2:retrievabilityType
-- @param {DateTime} $3:week
-- @param {Int} $4:editionId

with "active_allocators" as (select "allocator_id"  as "allocator_id",
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
                             from "active_allocators"
                             where ($4::int is null or "active_allocators"."editionId" = $4)),
--
     "open_data_pathway_allocators" as (
         -- edition 5: open by bookkeeping
         select distinct "allocator_client_bookkeeping"."allocator_id"
         from "allocator_client_bookkeeping"
                  join "active_in_edition" on "allocator_client_bookkeeping"."allocator_id" = "active_in_edition"."allocator_id"
         where "active_in_edition"."editionId" = 5
           and lower(
                       "allocator_client_bookkeeping"."bookkeeping_info"::jsonb->'Project'->>'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)'
               ) in ('[x] i confirm', 'yes')

         union

         -- edition 6: open = not enterprise, automated, faucet, market based
         select distinct "active_in_edition"."allocator_id"
         from "active_in_edition"
         where "active_in_edition"."editionId" = 6
           and not (("active_in_edition"."registry_info"::jsonb -> 'application' -> 'audit') ?|
               array['Enterprise Data', 'Automated', 'Faucet', 'Market Based'])
    )
--
select avg("avg_weighted_retrievability_success_rate_http") filter (where $2 = 'http' or $2 is null)                   as "http",
       avg("avg_weighted_retrievability_success_rate_url_finder") filter (where $2 = 'urlFinder' or $2 is null)        as "urlFinder",
       avg("avg_weighted_retrievability_success_rate") filter (where ($2 not in ('http', 'urlFinder')) or $2 is null ) as "spark"
from "allocators_weekly_acc"
         left join "allocator" on "allocators_weekly_acc"."allocator" = "allocator"."id"
         join "active_in_edition" on "active_in_edition"."allocator_id" = "allocator"."id"
where ($1 = false or "allocator" in (select "allocator_id" from "open_data_pathway_allocators"))
  and ("is_metaallocator" = false or "is_metaallocator" is null)
  and "week" = $3::timestamp;
