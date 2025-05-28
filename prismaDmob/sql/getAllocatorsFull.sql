-- @param {Boolean} $1:showInactive
-- @param {Boolean} $2:isMetaallocator?
-- @param {String} $3:filter?

with "allocators_using_metaallocators" as (select *
                                           from "verifier"
                                             where ("verifier"."isVirtual" = true))
select "verifier"."addressId"                                                               as "addressId",
       "verifier"."address"                                                                 as "address",
       case when "verifier"."auditTrail" = 'n/a' then null else "verifier"."auditTrail" end as "auditTrail",
       "verifier"."retries"                                                                 as "retries",
       case when "verifier"."name" = 'n/a' then null else trim("verifier"."name") end       as "name",
       case when "verifier"."orgName" = 'n/a' then null else trim("verifier"."orgName") end as "orgName",
       "verifier"."removed"                                                                 as "removed",
       "verifier"."initialAllowance"                                                        as "initialAllowance",
       "verifier"."allowance"::text                                                         as "allowance",
       "verifier"."inffered"                                                                as "inffered",
       "verifier"."isMultisig"                                                              as "isMultisig",
       "verifier"."createdAtHeight"                                                         as "createdAtHeight",
       "verifier"."issueCreateTimestamp"                                                    as "issueCreateTimestamp",
       "verifier"."createMessageTimestamp"                                                  as "createMessageTimestamp",
       coalesce(
               jsonb_agg(
                       distinct jsonb_build_object(
                       'error', case when "verifier_allowance"."error" = '' then null else "verifier_allowance"."error" end,
                       'height', "verifier_allowance"."height",
                       'msgCID', "verifier_allowance"."msgCID",
                       'retries', "verifier_allowance"."retries",
                       'dcSource', case when "verifier_allowance"."dcSource" = 'f080' then null else "verifier_allowance"."dcSource" end,
                       'addressId', "verifier_allowance"."addressId",
                       'allowance', "verifier_allowance"."allowance"::text,
                       'isVirtual', "verifier_allowance"."isVirtual",
                       'auditTrail', case when "verifier_allowance"."auditTrail" = 'n/a' then null else "verifier_allowance"."auditTrail" end,
                       'auditStatus', "verifier_allowance"."auditStatus",
                       'issueCreateTimestamp', "verifier_allowance"."issueCreateTimestamp",
                       'createMessageTimestamp', "verifier_allowance"."createMessageTimestamp"
                                )
               ), '[]'::jsonb
       )                                                                                                                                                                  as "allowanceArray",
       case when "verifier"."isMetaAllocator" = false then null else coalesce(
               jsonb_agg(
                       distinct jsonb_build_object(
                       'addressId', "allocators_using_metaallocators"."addressId",
                       'allowance', "allocators_using_metaallocators"."allowance"::text
                                )
               ) filter (where "allocators_using_metaallocators"."addressId" is not null), '[]'::jsonb
       ) end                                                                                                                                                              as "allocatorsUsingMetaallocator",
       coalesce(
               (select "auditStatus"
                from "verifier_allowance"
                where "verifierId" = "verifier"."id"
                  and "auditStatus" != 'notAudited'
                order by "height" desc
                limit 1),
               (select "auditStatus"
                from "verifier_allowance"
                where "verifierId" = "verifier"."id"
                order by "height" desc
                limit 1)
       )                                                                                                                                                                  as "auditStatus",
       "verifier"."initialAllowance" - "verifier"."allowance"                                                                                                             as "remainingDatacap",
       count(distinct "verified_client"."id")::int                                                                                                                        as "verifiedClientsCount",
       coalesce(sum("verifier_allowance"."allowance") filter (where "verifier_allowance"."createMessageTimestamp" > extract(epoch from (now() - interval '14 days'))), 0) as "receivedDatacapChange",
       coalesce(sum("verifier_allowance"."allowance") filter (where "verifier_allowance"."createMessageTimestamp" > extract(epoch from (now() - interval '90 days'))), 0) as "receivedDatacapChange90Days",
       "verifier"."addressEth"                                                                                                                                            as "addressEth",
       case when "verifier"."dcSource" = 'f080' then null else "verifier"."dcSource" end                                                                                  as "dcSource",
       "verifier"."isVirtual"                                                                                                                                             as "isVirtual",
       "verifier"."isMetaAllocator"                                                                                                                                       as "isMetaAllocator"
from "verifier"
         left join "allocators_using_metaallocators"
                   on "verifier"."addressEth" = "allocators_using_metaallocators"."dcSource"
         left join "verifier_allowance"
                   on "verifier"."id" = "verifier_allowance"."verifierId"
         left join "verified_client"
                   on "verifier"."addressId" = "verified_client"."verifierAddressId"
         where ($1 or "verifier"."createdAtHeight" > 3698160) -- current fil+ edition start
         and ("verifier"."isMetaAllocator" = $2 or $2 is null)
           and ($3 = '' or $3 is null
             or "verifier"."address" = $3
             or "verifier"."addressId" = $3
             or "verifier"."addressId" = $3
             or upper("verifier"."name") like upper('%' || $3 || '%')
             or upper("verifier"."orgName") like upper('%' || $3 || '%'))
group by "verifier"."id";
