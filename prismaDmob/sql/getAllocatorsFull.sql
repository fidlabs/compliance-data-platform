-- @param {Boolean} $1:showInactive

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
                       'dcSource', "verifier_allowance"."dcSource",
                       'addressId', "verifier_allowance"."addressId",
                       'allowance', "verifier_allowance"."allowance"::text,
                       'isVirtual', "verifier_allowance"."isVirtual",
                       'auditTrail', case when "verifier_allowance"."auditTrail" = 'n/a' then null else "verifier_allowance"."auditTrail" end,
                       'auditStatus', "verifier_allowance"."auditStatus",
                       'issueCreateTimestamp', "verifier_allowance"."issueCreateTimestamp",
                       'createMessageTimestamp', "verifier_allowance"."createMessageTimestamp"
                                )
               ), '[]'::jsonb
       )                                                                                    as "allowanceArray",
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
       "verifier"."dcSource"                                                                                                                                              as "dcSource",
       "verifier"."isVirtual"                                                                                                                                             as "isVirtual",
       "verifier"."isMetaAllocator"                                                                                                                                       as "isMetaAllocator"
from "verifier"
         left join "verifier_allowance"
                   on "verifier"."id" = "verifier_allowance"."verifierId"
         left join "verified_client"
                   on "verifier"."addressId" = "verified_client"."verifierAddressId"
         where ($1 or "verifier"."createdAtHeight" > 3698160) -- current fil+ edition start
         where $1 or "verifier"."createdAtHeight" > 3698160 -- current fil+ edition start
group by "verifier"."id";
