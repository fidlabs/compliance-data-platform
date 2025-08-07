-- @param {Boolean} $1:showInactive
-- @param {DateTime} $2:cutoffDate

select "verifier_allowance"."addressId"                                               as "allocatorId",
       sum("verifier_allowance"."allowance")::bigint                                  as "datacap",
       case when "verifier"."name" = 'n/a' then null else trim("verifier"."name") end as "allocatorName"
from "verifier_allowance"
         join "verifier" on "verifier_allowance"."verifierId" = "verifier"."id"
where ($1 or "verifier"."createdAtHeight" > 3698160) -- current fil+ edition start
  and (to_timestamp("height" * 30 + 1598306400) <= $2 or $2 is null) -- allocations up to provided date
group by "verifier_allowance"."addressId", "verifier"."name";
