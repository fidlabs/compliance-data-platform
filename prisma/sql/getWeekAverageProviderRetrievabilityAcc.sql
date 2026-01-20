-- @param {String} $1:dataType
-- @param {DateTime} $2:week
-- @param {Int} $3:editionId

with "active_allocators" as (select "allocator_id" as "allocator_id",
                                    6              as "editionId"
                             from "allocator_registry"
                             where "rejected" = false

                             union all

                             select "allocator_id" as "allocator_id",
                                    5              as "editionId"
                             from "allocator_registry_archive"
                             where "rejected" = false),
--
     "active_in_edition" as (select *
                             from "active_allocators"
                             where (
                                       $3::int is null
                                           or "active_allocators"."editionId" = $3)),
--
     "open_data_pathway_provider" as (select distinct "provider" as "provider"
                                      from "allocator_client_bookkeeping"
                                               join "client_provider_distribution" on "allocator_client_bookkeeping"."client_id" = "client_provider_distribution"."client"
                                               join "active_in_edition" on "active_in_edition"."allocator_id" = "allocator_client_bookkeeping"."allocator_id"
                                      where lower(
                                                    "allocator_client_bookkeeping"."bookkeeping_info"::jsonb->'Project'->>'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)'
                                            ) in ('[x] i confirm', 'yes'))
--
select avg("avg_retrievability_success_rate_url_finder") as "urlFinder"
from "providers_weekly_acc"
    left join "open_data_pathway_provider" using ("provider")
where (($1 = 'openData' and "open_data_pathway_provider"."provider" is not null) or
       ($1 = 'enterprise' and "open_data_pathway_provider"."provider" is null) or
       ($1 is null))
  and "week" = $2::timestamp;
