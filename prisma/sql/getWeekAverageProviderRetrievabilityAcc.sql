-- @param {Boolean} $1:openDataOnly
-- @param {String} $2:retrievabilityType
-- @param {DateTime} $3:week
-- @param {Int} $4:editionId

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
                                       $4::int is null
                                           or "active_allocators"."editionId" = $4)),
--
     "open_data_pathway_provider" as (select distinct "provider" as "provider"
                                      from "allocator_client_bookkeeping"
                                               join "client_provider_distribution" on "allocator_client_bookkeeping"."client_id" = "client_provider_distribution"."client"
                                               join "active_in_edition" on "active_in_edition"."allocator_id" = "allocator_client_bookkeeping"."allocator_id"
                                      where lower(
                                                    "allocator_client_bookkeeping"."bookkeeping_info"::jsonb->'Project'->>'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)'
                                            ) in ('[x] i confirm', 'yes'))
--
select avg("avg_retrievability_success_rate_http") filter (where $2 = 'http' or $2 is null)                  as "http",
       avg("avg_retrievability_success_rate_url_finder") filter (where $2 = 'urlFinder' or $2 is null)       as "urlFinder",
       avg("avg_retrievability_success_rate") filter (where ($2 not in ('http', 'urlFinder')) or $2 is null) as "spark"
from "providers_weekly_acc"
where ($1 = false or "provider" in (select "provider"
                                      from "open_data_pathway_provider"))
  and "week" = $3::timestamp;
