-- @param {Boolean} $1:showInactive
-- @param {Boolean} $2:isMetaallocator?
-- @param {String} $3:filter?
-- @param {String} $4:usingMetaallocatorId?

with "allocator_using_metaallocator" as (select * from "verifier" where "verifier"."isVirtual" = true),
     "metaallocator" as (select * from "verifier" where "isMetaAllocator" = true)
select "verifier"."addressId"                                                                                                       as "addressId",
       "verifier"."address"                                                                                                         as "address",
       case when "verifier"."auditTrail" = 'n/a' then null else "verifier"."auditTrail" end                                         as "auditTrail",
       "verifier"."retries"                                                                                                         as "retries",
       case when "verifier"."name" = 'n/a' then null else trim("verifier"."name") end                                               as "name",
       case when "verifier"."orgName" = 'n/a' then null else trim("verifier"."orgName") end                                         as "orgName",
       "verifier"."removed"                                                                                                         as "removed",
       "verifier"."initialAllowance"                                                                                                as "initialAllowance",
       "verifier"."allowance"::text                                                                                                 as "allowance",
       "verifier"."inffered"                                                                                                        as "inffered",
       "verifier"."isMultisig"                                                                                                      as "isMultisig",
       "verifier"."createdAtHeight"                                                                                                 as "createdAtHeight",
       "verifier"."issueCreateTimestamp"                                                                                            as "issueCreateTimestamp",
       "verifier"."createMessageTimestamp"                                                                                          as "createMessageTimestamp",
       "verifier"."initialAllowance" - "verifier"."allowance"                                                                       as "remainingDatacap",
       (select count(distinct "verified_client"."id")::int from "verified_client"
                                                           where "verified_client"."verifierAddressId" = "verifier"."addressId")    as "verifiedClientsCount",
       coalesce(sum("verifier_allowance"."allowance")
                filter (where "verifier_allowance"."createMessageTimestamp" > extract(epoch from (now() - interval '14 days'))), 0) as "receivedDatacapChange",
       coalesce(sum("verifier_allowance"."allowance")
                filter (where "verifier_allowance"."createMessageTimestamp" > extract(epoch from (now() - interval '90 days'))), 0) as "receivedDatacapChange90Days",
       "verifier"."addressEth"                                                                                                      as "addressEth",
       case when "verifier"."dcSource" = 'f080' then null else "verifier"."dcSource" end                                            as "dcSource",
       "verifier"."isVirtual"                                                                                                       as "isVirtual",
       "verifier"."isMetaAllocator"                                                                                                 as "isMetaAllocator",
       sum("verifier_allowance"."allowance")
       filter (where "verifier_allowance"."dcSource" != 'f080'
                 and upper("verifier_allowance"."dcSource") = upper("metaallocator"."addressEth"))                                  as "receivedDatacapFromMetaallocator",
       coalesce(
               jsonb_agg(
                       distinct jsonb_build_object(
                       'error', case when "verifier_allowance"."error" = '' then null else "verifier_allowance"."error" end,
                       'height', "verifier_allowance"."height",
                       'msgCID', "verifier_allowance"."msgCID",
                       'retries', "verifier_allowance"."retries",
                       'dcSource', case when "verifier_allowance"."dcSource" = 'f080' then null else "verifier_allowance"."dcSource" end,
                       'allowance', "verifier_allowance"."allowance"::text,
                       'isVirtual', "verifier_allowance"."isVirtual",
                       'auditTrail', case when "verifier_allowance"."auditTrail" = 'n/a' then null else "verifier_allowance"."auditTrail" end,
                       'auditStatus', "verifier_allowance"."auditStatus",
                       'issueCreateTimestamp', "verifier_allowance"."issueCreateTimestamp",
                       'createMessageTimestamp', "verifier_allowance"."createMessageTimestamp"
                                )
               ), '[]'::jsonb
       )                                                                                                                            as "allowanceArray",
       case when "verifier"."isMetaAllocator" = false then null else coalesce(
               jsonb_agg(
                       distinct jsonb_build_object(
                       'addressId', "allocator_using_metaallocator"."addressId",
                       'address', "allocator_using_metaallocator"."address",
                       'dcSource', "allocator_using_metaallocator"."dcSource"
                                )
               ) filter (where "allocator_using_metaallocator"."addressId" is not null), '[]'::jsonb
       ) end                                                                                                                        as "allocatorsUsingMetaallocator",
       case when "verifier"."isVirtual" = false then null else coalesce(
               jsonb_agg(
                       distinct jsonb_build_object(
                       'addressId', "metaallocator"."addressId",
                       'addressEth', "metaallocator"."addressEth",
                       'address', "metaallocator"."address"
                                )
               ), '[]'::jsonb
       ) end                                                                                                                        as "metaallocators",
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
       )                                                                                                                            as "auditStatus"
from "verifier"
         left join "allocator_using_metaallocator"
                   on upper("verifier"."addressEth") = upper("allocator_using_metaallocator"."dcSource")
         left join "metaallocator"
                   on upper("verifier"."dcSource") = upper("metaallocator"."addressEth")
         left join "verifier_allowance"
                   on "verifier"."id" = "verifier_allowance"."verifierId"
         where ($1 or "verifier"."createdAtHeight" > 3698160) -- current fil+ edition start
         and ("verifier"."isMetaAllocator" = $2 or $2 is null)
           and ($3 = '' or $3 is null
             or upper("verifier"."address") = upper($3)
             or upper("verifier"."addressId") = upper($3)
             or upper("verifier"."name") like upper('%' || $3 || '%')
             or upper("verifier"."orgName") like upper('%' || $3 || '%'))
         and (upper("metaallocator"."addressId") = upper($4) or $4 is null)
group by "verifier"."id";
